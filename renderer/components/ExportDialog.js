/* eslint-disable jsx-a11y/anchor-is-valid, import/no-extraneous-dependencies, react/button-has-type */
import React, { Component } from 'react';
import { withStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import AppBar from '@material-ui/core/AppBar';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import Divider from '@material-ui/core/Divider';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Dialog from '@material-ui/core/Dialog';
import Switch from '@material-ui/core/Switch';
import ExpandMore from '@material-ui/icons/ExpandMore';
import PopupState, { bindTrigger, bindMenu } from 'material-ui-popup-state/index';

const styles = theme => ({});

const exportFormats = {
  json: 'Export To JSON file',
  'wordpress-4-import-file': 'Export To WordPress 4.x Backup file',
  'wordpress-5-import-file': 'Export To WordPress 5.x Backup file',
  'blogger-import-file': 'Export To Blogger Backup file'
};

class ExportDialog extends Component {
  state = {
    open: false,
    exportType: 0,
    exportBatchSize: 5000,
    exportComments: true,
    exportFormatAnchorEl: null,
    exportOnlyPostsCreatedByMe: false,
    exportPrivatePosts: false,
    exportFormat: 'wordpress-5-import-file'
  };

  componentDidMount() {
    this.reset(this.props);
  }

  reset = ({ exportSource } = {}) => {
    const { all, community /*, collection, account*/ } = exportSource || {};
    this.setState({
      exportType: 0,
      exportBatchSize: 5000,
      exportComments: true,
      exportFormatAnchorEl: null,
      exportOnlyPostsCreatedByMe: false,
      exportPrivatePosts: !!community || all,
      exportFormat: all ? 'json' : 'wordpress-5-import-file'
    });
  };

  handleToggle = value => () => {
    this.setState({
      [value]: !this.state[value] // eslint-disable-line
    });
  };

  createBatchSizeMenuItem = (popupState, exportBatchSize) => (
    <MenuItem
      key={`exportBatchSize-${exportBatchSize}`}
      onClick={e => {
        popupState.close(e);
        this.setState({ exportBatchSize });
      }}
    >
      {exportBatchSize} posts
    </MenuItem>
  );

  onCloseDialog = () => {
    this.reset();

    const { onClose } = this.props;
    if (onClose) {
      onClose();
    }
  };

  render() {
    const {
      exportType,
      exportComments,
      exportPrivatePosts,
      exportFormatAnchorEl,
      exportOnlyPostsCreatedByMe,
      exportFormat,
      exportBatchSize
    } = this.state;
    const { exportSource, isOpen, onExportPosts, onExportImages } = this.props;
    const { all, community, collection, account } = exportSource || {};
    return (
      <Dialog open={isOpen} onClose={this.onCloseDialog} aria-labelledby="export-dialog-title">
        <div style={{ minWidth: 500 }}>
          <AppBar position="static">
            <Typography
              variant="body1"
              color="default"
              style={{ padding: '1rem', textAlign: 'center', fontSize: '1rem', color: '#fff' }}
            >
              {!exportSource || all ? (
                'Full JSON Export'
              ) : (
                <React.Fragment>
                  <strong>{(community && community.name) || (collection && collection.name) || account.name}</strong>{' '}
                  {(community && 'community') || (collection && 'collection') || account.type.toLowerCase()}
                </React.Fragment>
              )}
            </Typography>
          </AppBar>

          {/* <AppBar position="static" color="default" style={{ marginBottom: '0.5rem' }}>
            <Tabs
              value={exportType}
              onChange={(e, newExportType) => this.setState({ exportType: newExportType })}
              centered
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
            >
              <Tab label="Export Posts" />
              <Tab label="Export Images" />
              <Tab label="Export Videos" disabled />
            </Tabs>
          </AppBar> */}

          {exportType === 0 && (
            <React.Fragment>
              <List>
                <ListItem>
                  <ListItemText primary="Export comments" style={{ marginRight: '2rem' }} />
                  <ListItemSecondaryAction>
                    <Switch onChange={this.handleToggle('exportComments')} checked={exportComments} />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText primary="Export private posts" style={{ marginRight: '2rem' }} />
                  <ListItemSecondaryAction>
                    <Switch onChange={this.handleToggle('exportPrivatePosts')} checked={exportPrivatePosts} />
                  </ListItemSecondaryAction>
                </ListItem>
                {community ? (
                  <ListItem>
                    <ListItemText primary="Export only posts created by me" style={{ marginRight: '2rem' }} />
                    <ListItemSecondaryAction>
                      <Switch
                        onChange={this.handleToggle('exportOnlyPostsCreatedByMe')}
                        checked={exportOnlyPostsCreatedByMe}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ) : null}
                <ListItem>
                  <ListItemText primary="Split export file" style={{ marginRight: '2rem' }} />
                  <ListItemSecondaryAction>
                    <PopupState variant="popover" popupId="split-popup-menu">
                      {popupState => (
                        <React.Fragment>
                          <Button {...bindTrigger(popupState)} style={{ textTransform: 'lowercase' }}>
                            {exportBatchSize} posts <ExpandMore />
                          </Button>
                          <Menu {...bindMenu(popupState)}>
                            {[100, 300, 500, 1000, 2000, 3000, 5000, 10000, 20000, 30000, 50000, 100000].map(bs =>
                              this.createBatchSizeMenuItem(popupState, bs)
                            )}
                          </Menu>
                        </React.Fragment>
                      )}
                    </PopupState>
                  </ListItemSecondaryAction>
                </ListItem>

                {all ? null : (
                  <React.Fragment>
                    <Divider />
                    <ListItem
                      button
                      aria-haspopup="true"
                      aria-controls="lock-menu"
                      aria-label="Export format"
                      onClick={e => {
                        this.setState({ exportFormatAnchorEl: e.currentTarget.firstChild || e.currentTarget });
                      }}
                    >
                      <ListItemText primary="Export format" secondary={exportFormats[exportFormat]} />
                      <ExpandMore />
                    </ListItem>
                  </React.Fragment>
                )}
                <Divider />
              </List>
              <Menu
                id="lock-menu"
                anchorEl={exportFormatAnchorEl}
                open={Boolean(exportFormatAnchorEl)}
                onClose={() => {
                  this.setState({ exportFormatAnchorEl: null });
                }}
              >
                {Object.keys(exportFormats).map(ef => (
                  <MenuItem
                    key={ef}
                    selected={exportFormat === ef}
                    onClick={() => {
                      this.setState({ exportFormat: ef, exportFormatAnchorEl: null });
                    }}
                  >
                    {exportFormats[ef]}
                  </MenuItem>
                ))}
              </Menu>
              <Grid
                container
                direction="row"
                justify="space-between"
                alignItems="center"
                style={{ padding: '0.5rem 1rem 1rem 1rem' }}
              >
                <Button onClick={this.onCloseDialog}>Cancel</Button>
                <Button
                  onClick={() =>
                    onExportPosts({
                      exportSource,
                      exportFormat,
                      exportPrivatePosts,
                      exportOnlyPostsCreatedByMe,
                      exportComments,
                      exportBatchSize
                    })
                  }
                  variant="contained"
                  color="primary"
                >
                  Export Posts
                </Button>
              </Grid>
            </React.Fragment>
          )}

          {exportType === 1 && (
            <React.Fragment>
              <Grid
                container
                direction="row"
                justify="space-between"
                alignItems="center"
                style={{ padding: '0.5rem 1rem 1rem 1rem' }}
              >
                <Button onClick={this.onCloseDialog}>Cancel</Button>
                <Button
                  onClick={() =>
                    onExportImages({
                      exportSource,
                      exportPrivatePosts,
                      exportOnlyPostsCreatedByMe,
                      exportComments,
                      exportBatchSize
                    })
                  }
                  variant="contained"
                  color="primary"
                >
                  Export Images
                </Button>
              </Grid>
            </React.Fragment>
          )}
        </div>
      </Dialog>
    );
  }
}

export default withStyles(styles)(ExportDialog);
