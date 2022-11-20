/* eslint-disable import/no-extraneous-dependencies */
/* global document */
import React from "react";
import App, { Container } from "next/app";
import Head from "next/head";
import * as Sentry from "@sentry/browser";
import { MuiThemeProvider } from "@material-ui/core/styles";
import CssBaseline from "@material-ui/core/CssBaseline";
import JssProvider from "react-jss/lib/JssProvider";
import getPageContext from "../src/getPageContext";

if (process.env.NODE_ENV !== "development") {
	Sentry.init({
		dsn: "https://XXX@sentry.io/XXX",
		captureUnhandledRejections: true,
		release: process.env.VERSION || "dev",
		environment: process.env.VERSION ? "production" : "development",
	});
}

class MyApp extends App {
	constructor(...args) {
		super(...args);
		this.pageContext = getPageContext();
	}

	componentDidCatch(error, errorInfo) {
		if (errorInfo) {
			Sentry.configureScope((scope) => {
				Object.keys(errorInfo).forEach((key) => {
					scope.setExtra(key, errorInfo[key]);
				});
			});
		}
		Sentry.captureException(error || new Error("Unknown error"));

		// This is needed to render errors correctly in development / production
		super.componentDidCatch(error, errorInfo);
	}

	async componentDidMount() {
		const jssStyles = document.querySelector("#jss-server-side");
		if (jssStyles && jssStyles.parentNode) {
			jssStyles.parentNode.removeChild(jssStyles);
		}
	}

	render() {
		const { Component, pageProps } = this.props;
		return (
			<Container>
				<Head>
					<title>Google+ Exporter</title>
				</Head>
				<JssProvider
					registry={this.pageContext.sheetsRegistry}
					generateClassName={this.pageContext.generateClassName}
				>
					<MuiThemeProvider
						theme={this.pageContext.theme}
						sheetsManager={this.pageContext.sheetsManager}
					>
						<CssBaseline />
						<Component pageContext={this.pageContext} {...pageProps} />
					</MuiThemeProvider>
				</JssProvider>
			</Container>
		);
	}
}

export default MyApp;
