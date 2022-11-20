/* eslint-disable import/no-extraneous-dependencies */
import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ErrorIcon from '@material-ui/icons/Error';
import InfoIcon from '@material-ui/icons/Info';
import CloseIcon from '@material-ui/icons/Close';
import green from '@material-ui/core/colors/green';
import amber from '@material-ui/core/colors/amber';
import SnackbarContent from '@material-ui/core/SnackbarContent';
import WarningIcon from '@material-ui/icons/Warning';
import { withStyles } from '@material-ui/core/styles';

const variantIcon = {
  success: CheckCircleIcon,
  warning: WarningIcon,
  error: ErrorIcon,
  info: InfoIcon
};

const styles1 = theme => ({
  success: {
    backgroundColor: green[600]
  },
  error: {
    backgroundColor: theme.palette.error.dark
  },
  info: {
    backgroundColor: theme.palette.primary.dark
  },
  warning: {
    backgroundColor: amber[700]
  },
  icon: {
    fontSize: 20
  },
  iconVariant: {
    opacity: 0.9,
    marginRight: theme.spacing.unit
  },
  message: {
    display: 'flex',
    alignItems: 'center'
  },
  content: {
    cursor: 'pointer'
  }
});

function MySnackbarContent(props) {
  const { classes, className, message, onClose, variant, noIcon, noCloseIcon, ...other } = props;
  const Icon = noIcon ? null : variantIcon[variant];

  return (
    <SnackbarContent
      onClick={onClose}
      className={classNames(classes[variant], classes.content, className)}
      aria-describedby="client-snackbar"
      message={
        <span id="client-snackbar" className={classes.message}>
          {Icon ? <Icon className={classNames(classes.icon, classes.iconVariant)} /> : null}
          <span dangerouslySetInnerHTML={{ __html: message }} />
          <span style={{ marginLeft: '1rem' }} />
          {noCloseIcon ? null : <CloseIcon className={classes.icon} />}
        </span>
      }
      // action={
      //   onClose
      //     ? [
      //         <IconButton key="close" aria-label="Close" color="inherit" className={classes.close} onClick={onClose}>
      //           <CloseIcon className={classes.icon} />
      //         </IconButton>
      //       ]
      //     : []
      // }
      {...other}
    />
  );
}

MySnackbarContent.propTypes = {
  classes: PropTypes.object.isRequired, // eslint-disable-line
  className: PropTypes.string,
  message: PropTypes.node,
  onClose: PropTypes.func,
  variant: PropTypes.oneOf(['success', 'warning', 'error', 'info']).isRequired
};

const MySnackbarContentWrapper = withStyles(styles1)(MySnackbarContent);

export default MySnackbarContentWrapper;
