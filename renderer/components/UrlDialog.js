/* eslint-disable jsx-a11y/anchor-is-valid, import/no-extraneous-dependencies, react/button-has-type */
import React, { Component } from 'react';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';

const styles = theme => ({});

const initialState = () => ({
  url: '',
  helperText: '',
  error: false
});

class UrlDialog extends Component {
  state = initialState();

  componentDidMount() {
    this.setState(initialState());
  }

  onCloseDialog = isClose => async () => {
    const { onClose, onValidate } = this.props;

    if (isClose) {
      this.setState({ error: false, helperText: '', url: '' });
      if (onClose) {
        onClose();
      }
      return;
    }

    const { url } = this.state;

    const valid = onValidate && (await onValidate(url));
    const error = !valid;
    const helperText = (url && error && 'Not a valid Google+ feed URL!') || '';

    this.setState({ error, helperText, url: error ? url : '' });

    if (onClose && !error) {
      onClose(isClose ? null : url);
    }
  };

  onChange = e => this.setState({ url: e.target.value || '' });

  render() {
    const { url, error, helperText } = this.state;
    const { isOpen, title, contentText } = this.props;
    return (
      <Dialog
        open={isOpen}
        onClose={this.onCloseDialog(true)}
        aria-labelledby="url-dialog-title"
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id="form-dialog-title">{title || ''}</DialogTitle>
        <DialogContent>
          <DialogContentText>{contentText}</DialogContentText>
          <TextField
            variant="outlined"
            autoFocus
            margin="normal"
            id="url"
            label="Google+ Feed URL"
            type="url"
            fullWidth
            error={error}
            value={url}
            helperText={helperText}
            onChange={this.onChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={this.onCloseDialog(true)} variant="outlined">
            Cancel
          </Button>
          <Button onClick={this.onCloseDialog(false)} color="primary" variant="contained" disabled={!url}>
            Add Google+ Feed
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
}

export default withStyles(styles)(UrlDialog);
