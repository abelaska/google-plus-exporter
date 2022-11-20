/* global window */
/* eslint-disable jsx-a11y/anchor-is-valid, import/no-extraneous-dependencies, react/button-has-type */
import { ipcRenderer, remote } from 'electron';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import byteSize from 'byte-size';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Avatar from '@material-ui/core/Avatar';
import Typography from '@material-ui/core/Typography';
import LinearProgress from '@material-ui/core/LinearProgress';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
// import IconButton from '@material-ui/core/IconButton';
// import RefreshIcon from '@material-ui/icons/Refresh';
// import MoreVertIcon from '@material-ui/icons/MoreVert';
import Paper from '@material-ui/core/Paper';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import AppBar from '@material-ui/core/AppBar';
import SettingsIcon from '@material-ui/icons/Settings';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import Divider from '@material-ui/core/Divider';
import Snackbar from '@material-ui/core/Snackbar';
import { withStyles } from '@material-ui/core/styles';
import CircularProgress from '@material-ui/core/CircularProgress';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
// import Switch from '@material-ui/core/Switch';
// import ExpandMore from '@material-ui/icons/ExpandMore';
// import ArrowForward from '@material-ui/icons/ArrowForward';
import PopupState, { bindTrigger, bindMenu } from 'material-ui-popup-state/index';
import MySnackbarContentWrapper from '../components/MySnackbarContentWrapper';
import UrlDialog from '../components/UrlDialog';
import ExportDialog from '../components/ExportDialog';
import { urlToCommunityId, urlToProfileId } from '../components/plus';
import gumroadButtonBar from '../static/gumroad-button-bar.jpg';
import gumroadButtonLogo from '../static/gumroad-button-logo.png';

const plusUrl = 'https://plus.google.com/';
const loginUrl = `https://accounts.google.com/AccountChooser?continue=${encodeURIComponent(plusUrl)}`;

const send = (event, data) => ipcRenderer.send('message', { ...data, event });

const licenseErrors = {
  INVALID_LICENSE_KEY: 'Invalid license key.',
  BLOCKED_LICENSE_KEY: 'License key is blocked. Please contact our support.',
  SERVER_ERROR: 'Internal server error. Please, try again later.',
  INVALID_DEVICE_ID: 'Invalid device identification.',
  UNKNOWN_DEVICE: 'Unknown device.',
  DEVICE_COUNT_LICENSE_LIMIT_REACHED: 'This license key cannot be used on another device.'
};

// theme.spacing.unit = 8px

const styles = theme => ({
  root: {
    flexGrow: 1,
    overflowY: 'auto'
  },
  title: {
    marginTop: theme.spacing.unit * 4,
    marginBottom: theme.spacing.unit * 4
  },
  folderBlock: {
    marginTop: theme.spacing.unit * 4
  },
  progressBlock: {
    flexGrow: 1,
    minWidth: theme.spacing.unit * 30
  },
  progressImagesBlock: {
    flexGrow: 1,
    minWidth: theme.spacing.unit * 60
  },
  progressVideosBlock: {
    flexGrow: 1,
    minWidth: theme.spacing.unit * 60
  },
  lastExportBlock: {
    marginRight: theme.spacing.unit
  },
  downloadedAccountsHeader: {
    paddingLeft: theme.spacing.unit * 3
  },
  accountsHeader: {
    paddingLeft: theme.spacing.unit * 3
  },
  accountsBlock: {},
  accountsContainer: {
    maxWidth: 1000,
    padding: theme.spacing.unit * 4
  },
  progress: {
    marginBottom: theme.spacing.unit
  },
  initProgress: {
    marginTop: theme.spacing.unit * 3
  },
  close: {
    padding: theme.spacing.unit
  },
  nested: {
    marginTop: theme.spacing.unit * 1,
    paddingLeft: theme.spacing.unit * (3 + 3)
  },
  nestedDivider: {
    marginLeft: theme.spacing.unit * (3 + 3),
    marginTop: theme.spacing.unit * 2,
    marginBottom: theme.spacing.unit * 2
  },
  nestedDividerLabel: {
    marginLeft: theme.spacing.unit * (3 + 3),
    marginTop: theme.spacing.unit * 2,
    marginBottom: theme.spacing.unit * 1
  },
  accountsDivider: {
    marginTop: theme.spacing.unit * 4,
    marginBottom: theme.spacing.unit * 4,
    height: 3
  },
  updatePanel: {
    cursor: 'pointer',
    width: '100%',
    textAlign: 'center',
    padding: theme.spacing.unit * 4,
    backgroundColor: 'rgba(105, 183, 131, 0.3)',
    borderBottom: '1px solid rgba(105, 183, 131, 0.8)'
  },
  circularProgress: {
    color: '#ba68c8',
    animationDuration: '550ms'
  },
  gumroadButton: {
    cursor: 'pointer',
    outline: 0,
    backgroundColor: 'white !important',
    backgroundImage: `url(${gumroadButtonBar}) !important`,
    backgroundRepeat: 'repeat-x !important',
    borderRadius: '4px !important',
    boxShadow: 'rgba(0, 0, 0, .4) 0 0 2px !important',
    color: '#999 !important',
    display: 'inline-block !important',
    fontFamily: '-apple-system, ".SFNSDisplay-Regular", "Helvetica Neue", Helvetica, Arial, sans-serif !important',
    fontSize: '16px !important',
    fontStyle: 'normal !important',
    fontWeight: '500 !important',
    lineHeight: '50px !important',
    padding: '0 15px !important',
    textShadow: 'none !important',
    textDecoration: 'none !important'
  },
  gumroadButtonLogo: {
    backgroundImage: `url(${gumroadButtonLogo}) !important`,
    backgroundSize: 'cover !important',
    height: '17px !important',
    width: '16px !important',
    display: 'inline-block !important',
    marginBottom: '-3px !important',
    marginRight: '15px !important'
  }
});

class Index extends Component {
  state = {
    urlDialogProps: { isOpen: false },
    tabIndex: 0,
    torEnabled: false,
    torStatus: 'UNKNOWN',
    detectionInProgress: true,
    accounts: [],
    downloadedAccounts: [],
    isSnackbarOpen: false,
    snackbarMessage: '',
    snackbarVariant: 'success', // success | info | warning | error
    downloadPhase: 0,
    downloadPhases: 0,
    downloadedPosts: 0,
    downloadedComments: 0,
    downloadStreamsCount: 0,
    downloadingStreamsCount: 0,
    exporting: false,
    exportingAll: false,
    exportingImageList: false,
    exportingVideoList: false,
    exportingAccount: null,
    exportingCommunity: null,
    exportingCollection: null,
    exportSource: null,
    exportDialogOpen: false,
    downloading: false,
    downloadingImages: false,
    downloadingVideos: false,
    downloadingAccount: null,
    downloadingCollection: null,
    downloadingCommunity: null,
    verifyingLicense: true,
    isFreeLicense: true,
    license: null,
    licenseLimits: null,
    activateLicenseKey: '',
    activateLicenseOpen: false,
    activatingLicense: false,
    downloadLimitReached: false,
    updateAvailable: null,
    updateDownloadUrl: null,
    updateDownloading: false,
    updateDownloadingProgress: 0,
    images: {
      registered: 0,
      registeredSize: 0,
      downloaded: 0,
      downloadedSize: 0,
      downloadable: 0,
      downloadableSize: 0
    },
    videos: {
      registered: 0,
      registeredSize: 0,
      downloaded: 0,
      downloadedSize: 0,
      downloadable: 0,
      downloadableSize: 0
    }
  };

  componentDidMount() {
    ipcRenderer.on('plus-detection', this.handlePlusDetection);
    ipcRenderer.on('export', this.handleExport);
    ipcRenderer.on('download', this.handleDownload);
    ipcRenderer.on('license', this.handleLicense);
    ipcRenderer.on('app', this.handleApp);
    ipcRenderer.on('tor', this.handleTor);

    this.startPlusAccountsDetection();
    this.requestListOfDownloadedAccounts();
    this.requestListOfImages();
    this.requestListOfVideos();
    this.verifyLicense();
    this.checkForUpdate();
  }

  componentWillUnmount() {
    ipcRenderer.removeListener('plus-detection', this.handlePlusDetection);
    ipcRenderer.removeListener('export', this.handleExport);
    ipcRenderer.removeListener('download', this.handleDownload);
    ipcRenderer.removeListener('license', this.handleLicense);
    ipcRenderer.removeListener('app', this.handleApp);
    ipcRenderer.removeListener('tor', this.handleTor);
  }

  handleTor = (ev, message) => {
    console.log('handleTor', message);
    const { available, ready, enabled: torEnabled = false } = message;
    const torStatus = (available && ready && 'READY') || (available && 'AVAILABLE') || 'UNAVAILABLE';
    this.setState({ torStatus, torEnabled });
  };

  handleApp = (ev, message) => {
    // console.log('handleApp', message);
    const { event, latestVersion, isUpdateAvailable, latestDownloadUrl, percent, error, path } = message;
    switch (event) {
      case 'images-folder-changed':
        this.openSnackbar(`Image download folder changed to "${path}"`);
        break;
      case 'videos-folder-changed':
        this.openSnackbar(`Video download folder changed to "${path}"`);
        break;
      case 'export-folder-changed':
        this.openSnackbar(`Export folder changed to "${path}"`);
        break;
      case 'check-for-update':
        if (isUpdateAvailable) {
          this.setState({ updateAvailable: latestVersion, updateDownloadUrl: latestDownloadUrl });
        }
        break;
      case 'update-download-started':
        this.setState({ updateDownloading: true, updateDownloadingProgress: 0 });
        break;
      case 'update-download-finished':
        this.closeUpdateNotification();
        break;
      case 'update-download-failed':
        this.setState({ updateDownloading: false });
        break;
      case 'update-download-progress':
        this.setState({ updateDownloadingProgress: percent });
        break;
      case 'error':
        this.openSnackbar((error && error.message) || 'Something is wrong!', 'error');
        break;
      case 'add-custom-feed':
        this.setState({
          urlDialogProps: {
            inProgress: false,
            isOpen: false
          }
        });

        if (message.account || message.community) {
          this.requestListOfDownloadedAccounts();
          this.openSnackbar(`Google+ feed "${(message.account || message.community).name}" successfully registered.`);
        } else if (message.notFound) {
          this.openSnackbar('Requested Google+ feed not found', 'error');
        }
        break;
      default:
        break;
    }
  };

  handleLicense = (ev, message) => {
    // console.log('handleLicense', message);
    const { event, success, isFree, isLimitReached, limits, license, error } = message;
    let { activateLicenseOpen } = this.state;
    switch (event) {
      case 'license-limit-reached':
        this.setState({ downloadLimitReached: true });
        break;
      case 'license-to-clipboard':
        if (success) {
          this.openSnackbar('License key copied to clipboard.', 'info');
        }
        break;
      case 'license':
        // FIXME
        break;
      case 'activation-begin':
        this.setState({ activatingLicense: true });
        break;
      case 'activation-end':
        if (error) {
          const msg = error.code && licenseErrors[error.code];
          if (msg) {
            this.openSnackbar(msg, 'error');
          }
        } else if (!isFree) {
          activateLicenseOpen = false;
          this.openSnackbar('License key successfully activated!');
        }
        this.setState({
          license,
          activateLicenseOpen,
          activatingLicense: false,
          isFreeLicense: isFree,
          licenseLimits: limits
        });
        window.Beacon('identify', { 'G+Exporter License': license, 'G+Exporter Version': process.env.VERSION });
        break;
      case 'verification-begin':
        this.setState({ verifyingLicense: true, isFreeLicense: true, license: null, licenseLimits: null });
        break;
      case 'verification-end':
        window.Beacon('identify', { license });
        this.setState({
          verifyingLicense: false,
          isFreeLicense: isFree,
          license,
          licenseLimits: limits,
          downloadLimitReached: isLimitReached
        });
        break;
      default:
        break;
    }
  };

  handleDownload = (ev, message) => {
    // console.log('handleDownload', message);
    const {
      event,
      error,
      downloadPhase = 0,
      downloadPhases = 0,
      downloadedPosts = 0,
      downloadedComments = 0,
      profileId,
      accountId,
      communityId,
      collectionId,
      images = {
        registered: 0,
        registeredSize: 0,
        downloaded: 0,
        downloadedSize: 0,
        downloadable: 0,
        downloadableSize: 0
      },
      videos = {
        registered: 0,
        registeredSize: 0,
        downloaded: 0,
        downloadedSize: 0,
        downloadable: 0,
        downloadableSize: 0
      },
      downloadedAccounts = 0,
      downloadImagesCount = 0,
      downloadImagesSize = 0,
      downloadedImagesCount = 0,
      downloadedImagesSize = 0,
      downloadVideosCount = 0,
      downloadVideosSize = 0,
      downloadedVideosCount = 0,
      downloadedVideosSize = 0,
      success
    } = message;
    const { downloadStreamsCount, downloadingStreamsCount, downloadedAccounts: stateDownloadedAccounts } = this.state;

    const accounts = downloadedAccounts || stateDownloadedAccounts;
    const account = accountId && accounts.find(a => a.id === accountId);
    const community = account && communityId && account.communities.find(c => c.id === communityId);
    const collection = account && collectionId && account.collections.find(c => c.id === collectionId);

    const downloadingAccount = !community && !collection && account;
    const downloadingCollection = !community && collection;
    const downloadingCommunity = !collection && community;
    const downloading = !!(community || collection || account || profileId);

    switch (event) {
      case 'list-downloaded-accounts':
        this.setState({ downloadedAccounts: downloadedAccounts || [] });
        break;
      case 'list-images':
        this.setState({ images });
        break;
      case 'list-videos':
        this.setState({ videos });
        break;
      case 'begin-images':
        this.setState({
          downloading: true,
          downloadImagesCount: 0,
          downloadImagesSize: 0,
          downloadingImages: true,
          downloadedImagesCount: 0,
          downloadedImagesSize: 0
        });
        break;
      case 'begin-videos':
        this.setState({
          downloading: true,
          downloadVideosCount: 0,
          downloadVideosSize: 0,
          downloadingVideos: true,
          downloadedVideosCount: 0,
          downloadedVideosSize: 0
        });
        break;
      case 'end-images':
        if (success) {
          // eslint-disable-next-line
          this.openSnackbar('Images successfully downloaded.');
        }
        this.setState({
          images,
          downloading: false,
          downloadImagesCount: 0,
          downloadImagesSize: 0,
          downloadingImages: false,
          downloadedImagesCount: 0,
          downloadedImagesSize: 0
        });
        break;
      case 'end-videos':
        if (success) {
          // eslint-disable-next-line
          this.openSnackbar('Videos successfully downloaded.');
        }
        this.setState({
          videos,
          downloading: false,
          downloadVideosCount: 0,
          downloadVideosSize: 0,
          downloadingVideos: false,
          downloadedVideosCount: 0,
          downloadedVideosSize: 0
        });
        break;
      case 'begin':
        this.setState({
          downloading,
          downloadingAccount,
          downloadingCollection,
          downloadingCommunity,
          downloadingImages: false,
          downloadingVideos: false
        });
        break;
      case 'end':
        if (success) {
          // eslint-disable-next-line
          if (this.state.downloadingAccount || this.state.downloadingCollection || this.state.downloadingCommunity) {
            this.openSnackbar('Google+ feed successfully downloaded.');
          } else {
            this.openSnackbar('Feed list successfully refreshed.');
          }
          this.requestListOfDownloadedAccounts();
          this.requestListOfImages();
          this.requestListOfVideos();
        } else if (error && error.message) {
          this.openSnackbar(error.message, 'error');
        }
        this.setState({
          downloading: false,
          downloadingImages: false,
          downloadingVideos: false,
          downloadingAccount: null,
          downloadingCollection: null,
          downloadingCommunity: null,
          downloadPhase: 0,
          downloadPhases: 0,
          downloadedPosts: 0,
          downloadedComments: 0,
          downloadStreamsCount: 0,
          downloadingStreamsCount: 0
        });
        break;
      case 'stream-begin':
        this.setState({
          downloadStreamsCount: downloadStreamsCount + 1,
          downloadingStreamsCount: downloadingStreamsCount + 1
        });
        break;
      case 'stream-end':
        this.setState({ downloadingStreamsCount: Math.max(0, downloadingStreamsCount - 1) });
        break;
      case 'update':
        this.setState({
          downloadPhase,
          downloadPhases,
          downloadedPosts,
          downloadedComments,
          downloadImagesCount,
          downloadImagesSize,
          downloadedImagesCount,
          downloadedImagesSize,
          downloadVideosCount,
          downloadVideosSize,
          downloadedVideosCount,
          downloadedVideosSize
        });
        break;
      default:
        break;
    }
  };

  handleExport = (ev, message) => {
    // console.log('handleExport', message);
    const {
      event,
      error,
      exportAll,
      accountId,
      collectionId,
      communityId,
      success,
      postsCount = 0,
      imagesCount = 0,
      videosCount = 0
    } = message;
    const { downloadedAccounts } = this.state;
    const account = accountId && downloadedAccounts.find(a => a.id === accountId);
    const community = account && communityId && account.communities.find(c => c.id === communityId);
    const collection = account && collectionId && account.collections.find(c => c.id === collectionId);

    const exportingAll = !!exportAll;
    const exportingAccount = !community && !collection && account;
    const exportingCollection = !community && collection;
    const exportingCommunity = !collection && community;
    const exporting = !!(community || collection || account) || exportingAll;

    switch (event) {
      case 'begin-image-list':
        this.setState({ exporting: true, exportingImageList: true });
        break;
      case 'begin-video-list':
        this.setState({ exporting: true, exportingVideoList: true });
        break;
      case 'end-image-list':
        if (success) {
          this.openSnackbar(`Successfully exported list with ${imagesCount} image${imagesCount === 1 ? '' : 's'}`);
        } else if (error && error.message) {
          this.openSnackbar(error.message, 'error');
        }
        this.setState({ exporting: false, exportingImageList: false });
        break;
      case 'end-video-list':
        if (success) {
          this.openSnackbar(`Successfully exported list with ${videosCount} video${videosCount === 1 ? '' : 's'}`);
        } else if (error && error.message) {
          this.openSnackbar(error.message, 'error');
        }
        this.setState({ exporting: false, exportingVideoList: false });
        break;
      case 'begin':
        this.setState({
          exporting,
          exportingAll,
          exportingAccount,
          exportingCollection,
          exportingCommunity,
          exportingImageList: false,
          exportingVideoList: false
        });
        break;
      case 'end':
        if (success) {
          if (postsCount) {
            this.openSnackbar(`Successfully exported ${postsCount} post${postsCount === 1 ? '' : 's'}`);
          } else {
            this.openSnackbar(`No post qualified for export. Please, try to refresh the feed.`);
          }
        } else if (error && error.message) {
          this.openSnackbar(error.message, 'error');
        }
        this.setState({
          exporting: false,
          exportingAll: false,
          exportingImageList: false,
          exportingVideoList: false,
          exportingAccount: null,
          exportingCommunity: null,
          exportingCollection: null
        });
        break;
      default:
        break;
    }
  };

  handlePlusDetection = (ev, message) => {
    // console.log('handlePlusDetection', message);
    const { account, event } = message;
    const { accounts } = this.state;

    switch (event) {
      case 'begin':
        this.setState({ detectionInProgress: true });
        break;
      case 'close':
      case 'end':
        this.setState({ detectionInProgress: false });
        break;
      case 'detected':
        // FIXME remove this.state.accounts
        if (account && !accounts.find(a => a.id === account.profile.id)) {
          this.setState({ accounts: accounts.concat([account.profile]) });
        }
        this.requestListOfDownloadedAccounts();
        this.requestListOfImages();
        this.requestListOfVideos();
        break;
      default:
        break;
    }
  };

  openActivateLicenseDialog = () => {
    this.setState({ activateLicenseOpen: true, activateLicenseKey: '' });
  };

  handleCloseActivateLicenseDialog = () => {
    this.setState({ activateLicenseOpen: false, activateLicenseKey: '' });
  };

  handleActivateLicenseChange = e => {
    this.setState({ activateLicenseKey: e.target.value || '' });
  };

  openExportDialog = exportSource => () => this.setState({ exportSource, exportDialogOpen: true });

  handleCloseExportDialog = () => {
    this.setState({ exportDialogOpen: false });
  };

  startExport = ({
    exportSource,
    exportPrivatePosts,
    exportOnlyPostsCreatedByMe,
    exportComments,
    exportFormat,
    exportBatchSize
  }) => {
    const { all, account, community, collection } = exportSource;
    const options = { exportPrivatePosts, exportOnlyPostsCreatedByMe, exportComments, batchSize: exportBatchSize };

    this.handleCloseExportDialog();

    setTimeout(() => {
      all
        ? send('export-all', { options })
        : send('export-account', {
            options,
            type: exportFormat,
            accountId: account.id,
            collectionId: collection && collection.id,
            communityId: community && community.id
          });
    }, 0);
  };

  activateLicenseKey = () => {
    const { activateLicenseKey } = this.state;
    if (activateLicenseKey) {
      this.activateLicense(activateLicenseKey);
    }
  };

  startPlusAccountsDetection = () => send('plus-detection-start', { initial: true });

  requestListOfDownloadedAccounts = () => send('list-downloaded-accounts');

  requestListOfImages = () => send('list-images');

  requestListOfVideos = () => send('list-videos');

  exportImageList = () => send('export-image-list');

  exportVideoList = () => send('export-video-list');

  stopDetection = () => send('cancel-plus-detection');

  downloadAccount = ({ account, collection, community }) => {
    const query = {
      ...(account ? { accountId: account.id, profileId: account.profileId || account.id } : null),
      ...(collection ? { collectionId: collection.id } : null),
      ...(community ? { communityId: community.id } : null)
    };
    send('download-account', query);
  };

  downloadImages = ({ account, collection, community }) => {
    const query = {
      ...(account ? { accountId: account.id, profileId: account.profileId || account.id } : null),
      ...(collection ? { collectionId: collection.id } : null),
      ...(community ? { communityId: community.id } : null)
    };
    send('download-images', query);
  };

  downloadVideos = ({ account, collection, community }) => {
    const query = {
      ...(account ? { accountId: account.id, profileId: account.profileId || account.id } : null),
      ...(collection ? { collectionId: collection.id } : null),
      ...(community ? { communityId: community.id } : null)
    };
    send('download-videos', query);
  };

  // refreshAccountFeedsList = account => send('download-account', { profileId: account.id, skipPosts: true });

  openLicenseBuy = () => send('license-buy');

  openExportsFolder = () => send('open-exports-folder');

  openImagesFolder = () => send('open-images-folder');

  openVideosFolder = () => send('open-videos-folder');

  verifyLicense = () => send('license-verify');

  activateLicense = license => send('license-activate', { license });

  copyLicenseKeyToClipboard = license => () => send('license-to-clipboard', { license });

  checkForUpdate = () => send('check-for-update');

  startUpdateDownload = updateUrl => send('start-update-download', { updateUrl });

  plusLogout = () => {
    send('plus-logout');
    this.setState({
      accounts: [],
      downloading: false,
      downloadingAccount: null,
      downloadingCollection: null,
      downloadingCommunity: null,
      exporting: false,
      exportingAccount: null,
      downloadPhase: 0,
      downloadPhases: 0,
      downloadedPosts: 0,
      downloadedComments: 0,
      downloadStreamsCount: 0,
      downloadingStreamsCount: 0,
      downloadImagesCount: 0,
      downloadImagesSize: 0,
      downloadedImagesCount: 0,
      downloadedImagesSize: 0,
      downloadVideosCount: 0,
      downloadVideosSize: 0,
      downloadedVideosCount: 0,
      downloadedVideosSize: 0
    });
  };

  closeSnackbar = () => {
    this.setState({ isSnackbarOpen: false });
    return true;
  };

  openSnackbar = (snackbarMessage, snackbarVariant = 'success') => {
    this.setState({ snackbarMessage, snackbarVariant, isSnackbarOpen: true });
  };

  maskLicenseKey = licenseKey => (licenseKey ? `${licenseKey.substring(0, 4)} … ${licenseKey.substr(-4)}` : '');

  handleToggle = value => () => {
    this.setState({
      [value]: !this.state[value] // eslint-disable-line
    });
  };

  closeUpdateNotification = () => {
    this.setState({ updateAvailable: null, updateDownloadUrl: null, updateDownloading: false });
  };

  downloadUpdate = e => {
    e.stopPropagation();
    e.preventDefault();
    const { updateDownloadUrl } = this.state;
    if (updateDownloadUrl) {
      this.startUpdateDownload(updateDownloadUrl);
    }
  };

  renderPostsCount = ({ all, postsCount, downloadedAt }) => {
    const { public: pub = 0, private: priv = 0 } = postsCount || {};
    const toDate = downloadedAt ? ` to ${new Date(downloadedAt * 1000).toLocaleDateString()}` : '';
    return (
      (all && pub + priv === 0 && 'No posts downloaded yet') ||
      (!all && pub + priv === 0 && 'No posts downloaded yet, click ➞') ||
      (pub && !priv && `${pub} public post${pub === 1 ? '' : 's'}${toDate}`) ||
      (!pub && priv && `${priv} private post${priv === 1 ? '' : 's'}${toDate}`) ||
      `(${pub} public + ${priv} private) ${pub + priv} posts${toDate}`
    );
  };

  downloadedAccountTotalPostsCount = account => {
    const { downloadedAccounts } = this.state;
    const da = downloadedAccounts.find(a => a.id === account.id);
    if (!da) {
      return null;
    }
    const profileId = da.profileId || da.id;
    const initialCounts = da.profileId ? { private: 0, public: 0 } : { ...da.totalPostsCount };
    if (!profileId) {
      return null;
    }
    return downloadedAccounts
      .filter(a => a.profileId === profileId)
      .reduce((r, a) => {
        r.private = (r.private || 0) + ((a.totalPostsCount && a.totalPostsCount.private) || 0);
        r.public = (r.public || 0) + ((a.totalPostsCount && a.totalPostsCount.public) || 0);
        return r;
      }, initialCounts);
  };

  onChangeImagesFolder = ({ popupState }) => e => {
    if (popupState) {
      popupState.close(e);
    }
    send('change-images-folder');
  };

  toggleTorUse = ({ popupState }) => e => {
    if (popupState) {
      popupState.close(e);
    }
    let { torEnabled } = this.state;
    torEnabled = !torEnabled;
    if (torEnabled) {
      send('enable-tor');
    } else {
      send('disable-tor');
    }
    this.setState({ torEnabled });
  };

  onChangeVideosFolder = ({ popupState }) => e => {
    if (popupState) {
      popupState.close(e);
    }
    send('change-videos-folder');
  };

  onChangeExportFolder = ({ popupState }) => e => {
    if (popupState) {
      popupState.close(e);
    }
    send('change-export-folder');
  };

  onDownloadFeed = ({ popupState, ...query }) => e => {
    if (popupState) {
      popupState.close(e);
    }
    this.downloadAccount(query);
  };

  onDownloadImages = ({ popupState, ...query } = {}) => e => {
    if (popupState) {
      popupState.close(e);
    }
    this.downloadImages(query);
  };

  onDownloadVideos = ({ popupState, ...query } = {}) => e => {
    if (popupState) {
      popupState.close(e);
    }
    this.downloadVideos(query);
  };

  onExportImageList = ({ popupState, ...query } = {}) => e => {
    if (popupState) {
      popupState.close(e);
    }
    this.exportImageList();
  };

  onExportVideoList = ({ popupState, ...query } = {}) => e => {
    if (popupState) {
      popupState.close(e);
    }
    this.exportVideoList();
  };

  onExportFeed = ({ popupState, ...query }) => e => {
    if (popupState) {
      popupState.close(e);
    }
    this.openExportDialog(query)();
  };

  onRefreshFeeds = () => send('refresh-all');

  onDownloadFeeds = () => send('refresh-all', { postsGT: -1 });

  onFullJsonExport = () => () => {
    this.openExportDialog({ all: true })();
  };

  googleAccountPostsCount = ga => {
    const { downloadedAccounts } = this.state;
    const stat = { total: 0, private: 0, public: 0 };

    const add = o => {
      stat.total += o.postsCount.total;
      stat.public += o.postsCount.public;
      stat.private += o.postsCount.private;
    };

    downloadedAccounts
      .filter(a => a.googleAccountId === ga.id)
      .forEach(a => {
        add(a);
        a.collections.forEach(add);
        a.communities.forEach(add);
      });

    return stat;
  };

  isDownloadDisabled = account => {
    const { torStatus, torEnabled, accounts, exporting, downloading } = this.state;
    const isLoggedIn = accounts.length > 0;
    const disable = downloading || exporting;
    return disable || !isLoggedIn || (torEnabled && torStatus !== 'READY') || !account.available;
  };

  isRefreshAllDisabled = checkOnlyPosts => {
    let totalPosts = 0;
    const { downloadedAccounts = [] } = this.state;

    for (let i = 0; i < downloadedAccounts.length; i++) {
      if (!checkOnlyPosts) {
        if (this.isDownloadDisabled(downloadedAccounts[i])) {
          return true;
        }
      }
      totalPosts += this.googleAccountPostsCount(downloadedAccounts[i]).total;
    }

    return totalPosts === 0;
  };

  openUrlDialog = e => {
    this.setState({
      urlDialogProps: {
        isOpen: true,
        title: `Add Google+ Profile, Page or Community URL`,
        contentText: (
          <React.Fragment>
            <p style={{ marginTop: 0 }}>
              <a
                href="#"
                onClick={() => {
                  remote.shell.openExternal(
                    'https://medium.com/google-plus-exporter/where-to-get-google-community-profile-or-page-url-fa41444a771e'
                  );
                }}
              >
                Where to get Google+ community, profile or page URL?
              </a>
            </p>
            {/* <Typography variant="subtitle2" color="textPrimary">
              Example Google+ Community URLs:
            </Typography>
            <p style={{ margin: '0.3rem 0' }}>
              <Typography variant="caption" color="textSecondary">
                https://plus.google.com/communities/108569270224680870230
              </Typography>
            </p>
            <p style={{ margin: '0.3rem 0' }}>
              <Typography variant="caption" color="textSecondary">
                https://plus.google.com/b/105750980959577516811/communities/108569270224680870230
              </Typography>
            </p>
            <Typography variant="subtitle2" color="textPrimary" style={{ marginTop: '1rem' }}>
              Example Google+ Profile and Page URLs:
            </Typography>
            <p style={{ margin: '0.3rem 0' }}>
              <Typography variant="caption" color="textSecondary">
                https://plus.google.com/115620878851836664537
              </Typography>
            </p>
            <p style={{ margin: '0.3rem 0' }}>
              <Typography variant="caption" color="textSecondary">
                https://plus.google.com/105750980959577516811
              </Typography>
            </p>
            <p style={{ margin: '0.3rem 0' }}>
              <Typography variant="caption" color="textSecondary">
                https://plus.google.com/b/105750980959577516811/105750980959577516811
              </Typography>
            </p> */}
          </React.Fragment>
        ),
        onValidate: async url => {
          const communityId = urlToCommunityId(url);
          const profileId = urlToProfileId(url);
          return !!(communityId || profileId);
        },
        onClose: url => {
          const communityId = urlToCommunityId(url);
          const profileId = urlToProfileId(url);
          const inProgress = !!(communityId || profileId);

          this.setState({ urlDialogProps: { inProgress, isOpen: false } });

          if (inProgress) {
            send('add-custom-feed', { url, communityId, profileId });
          }
        }
      }
    });
  };

  render() {
    const { classes } = this.props;
    const {
      urlDialogProps,
      tabIndex,
      torStatus,
      torEnabled,
      isSnackbarOpen,
      snackbarMessage,
      snackbarVariant,
      accounts,
      detectionInProgress,
      downloadStreamsCount,
      downloadingStreamsCount,
      downloadPhase,
      downloadPhases,
      downloadedPosts,
      downloadedComments,
      downloadedAccounts,
      exporting,
      exportingImageList,
      exportingVideoList,
      exportingAccount,
      exportingCommunity,
      exportingCollection,
      exportDialogOpen,
      exportSource,
      downloading,
      downloadingAccount,
      downloadingCollection,
      downloadingCommunity,
      verifyingLicense,
      isFreeLicense,
      license,
      licenseLimits,
      activateLicenseKey,
      activateLicenseOpen,
      activatingLicense,
      downloadLimitReached,
      updateAvailable,
      updateDownloadUrl,
      updateDownloading,
      updateDownloadingProgress,
      downloadingImages,
      downloadImagesCount,
      downloadImagesSize,
      downloadedImagesCount,
      downloadedImagesSize,
      images,
      downloadingVideos,
      downloadVideosCount,
      downloadVideosSize,
      downloadedVideosCount,
      downloadedVideosSize,
      videos
    } = this.state;
    const isLoggedIn = accounts.length > 0;
    const disable = downloading || exporting;
    const donePercent =
      (downloadingImages &&
        (downloadImagesCount > 0 ? Math.ceil((downloadedImagesCount * 100) / downloadImagesCount) : 0)) ||
      (downloadingVideos &&
        (downloadVideosCount > 0 ? Math.ceil((downloadedVideosCount * 100) / downloadVideosCount) : 0)) ||
      (downloadStreamsCount > 0 ? 100 - Math.ceil((downloadingStreamsCount * 100) / downloadStreamsCount) : 0);

    const FeedStats = ({ all, postsCount, downloadedAt, skipLimit }) => (
      <Grid container direction="column" justify="center" alignItems="flex-end">
        <Typography variant="caption" color="textSecondary" style={{ marginRight: '1rem' }}>
          {this.renderPostsCount({ all, postsCount, downloadedAt })}
        </Typography>
        {!skipLimit &&
        licenseLimits &&
        licenseLimits.postsPerFeed > -1 &&
        postsCount.private + postsCount.public >= licenseLimits.postsPerFeed ? (
          <Typography variant="caption" color="error" style={{ marginRight: '1rem', fontWeight: 'bold' }}>
            Limit reached, feed incomplete!
          </Typography>
        ) : null}
      </Grid>
    );

    const DownloadImagesProgress = () => (
      <Grid item className={downloadingImages ? classes.progressImagesBlock : classes.progressBlock}>
        <Grid container direction="column">
          <LinearProgress
            variant={donePercent > 0 ? 'determinate' : undefined}
            value={donePercent}
            className={classes.progress}
          />
          <Grid container direction="row" justify="space-between">
            {donePercent > 0 ? <Typography variant="caption">{donePercent}%</Typography> : null}
            <Typography variant="caption"> </Typography>
            <Typography variant="caption">
              {downloadingImages
                ? ((donePercent > 0 || downloadedImagesCount > 0) &&
                    `Downloaded ${downloadedImagesCount} ${
                      downloadedImagesSize > 0 ? ` (${byteSize(downloadedImagesSize)})` : ''
                    } of ${downloadImagesCount} ${
                      downloadImagesSize > 0 ? ` (${byteSize(downloadImagesSize)})` : ''
                    }`) ||
                  `Preparing download...`
                : (downloadedPosts === 0 && downloadedComments === 0 && 'Preparing download...') ||
                  `${downloadedPosts} post${downloadedPosts > 1 ? 's' : ''} + ${downloadedComments} comment${
                    downloadedComments > 1 ? 's' : ''
                  }`}
            </Typography>
          </Grid>
        </Grid>
      </Grid>
    );

    const DownloadVideosProgress = () => (
      <Grid item className={downloadingVideos ? classes.progressVideosBlock : classes.progressBlock}>
        <Grid container direction="column">
          <LinearProgress
            variant={donePercent > 0 ? 'determinate' : undefined}
            value={donePercent}
            className={classes.progress}
          />
          <Grid container direction="row" justify="space-between">
            {donePercent > 0 ? <Typography variant="caption">{donePercent}%</Typography> : null}
            <Typography variant="caption"> </Typography>
            <Typography variant="caption">
              {downloadingVideos
                ? ((donePercent > 0 || downloadedVideosCount > 0) &&
                    `Downloaded ${downloadedVideosCount} ${
                      downloadedVideosSize > 0 ? ` (${byteSize(downloadedVideosSize)})` : ''
                    } of ${downloadVideosCount} ${
                      downloadVideosSize > 0 ? ` (${byteSize(downloadVideosSize)})` : ''
                    }`) ||
                  `Preparing download...`
                : (downloadedPosts === 0 && downloadedComments === 0 && 'Preparing download...') ||
                  `${downloadedPosts} post${downloadedPosts > 1 ? 's' : ''} + ${downloadedComments} comment${
                    downloadedComments > 1 ? 's' : ''
                  }`}
            </Typography>
          </Grid>
        </Grid>
      </Grid>
    );

    const DownloadProgress = () => (
      <Grid
        item
        className={downloadingImages || downloadingVideos ? classes.progressImagesBlock : classes.progressBlock}
      >
        <Grid container direction="row" justify="flex-end" alignItems="center">
          <Typography variant="caption">
            {(downloadedPosts === 0 && downloadedComments === 0 && 'Preparing download...') ||
              `${downloadPhase > 0 ? `Pass ${downloadPhase} of ${downloadPhases} … ` : ''}${downloadedPosts} post${
                downloadedPosts > 1 ? 's' : ''
              } + ${downloadedComments} comment${downloadedComments > 1 ? 's' : ''}`}
          </Typography>
          <CircularProgress
            variant="indeterminate"
            disableShrink
            className={classes.circularProgress}
            size={16}
            thickness={6}
            style={{ marginLeft: '1rem' }}
          />
        </Grid>
      </Grid>
    );

    const FeedPrimaryActionButtons = ({ query, postsCount }) =>
      postsCount.total === 0 ? (
        <Button
          variant="contained"
          color="primary"
          disabled={this.isDownloadDisabled(query.account)}
          onClick={this.onDownloadFeed(query)}
        >
          Download
        </Button>
      ) : (
        <React.Fragment>
          <Button
            variant="outlined"
            color="primary"
            style={{ marginRight: '1rem' }}
            aria-label="Refresh Feed"
            title="Refresh Feed"
            disabled={this.isDownloadDisabled(query.account)}
            onClick={this.onDownloadFeed(query)}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={disable || postsCount.total === 0}
            onClick={this.onExportFeed(query)}
          >
            Export
          </Button>
        </React.Fragment>
      );

    const Communities = ({ title, account, communities }) => (
      <React.Fragment>
        {communities.length ? (
          <React.Fragment>
            <Divider component="li" className={classes.nestedDivider} />
            <li>
              <Typography className={classes.nestedDividerLabel} color="textSecondary" variant="caption">
                {title}
              </Typography>
            </li>
          </React.Fragment>
        ) : null}

        {communities.map(c => (
          <ListItem key={c.id} className={classes.nested}>
            <ListItemAvatar>
              <Avatar alt={c.name} src={c.image} />
            </ListItemAvatar>
            <ListItemText
              primary={c.name}
              secondary={
                <Typography variant="caption" color="textSecondary">
                  Google+ Community / {c.membersCount} member{c.membersCount === 1 ? '' : 's'}
                </Typography>
              }
            />
            <ListItemSecondaryAction>
              {(exporting && exportingCommunity && exportingCommunity.id === c.id && (
                <Grid container className={classes.progressBlock} direction="row" justify="center">
                  <CircularProgress size={16} />
                </Grid>
              )) ||
                (downloading && downloadingCommunity && downloadingCommunity.id === c.id && <DownloadProgress />) || (
                  <Grid container direction="row" justify="flex-start" alignItems="center">
                    <Grid item>
                      <FeedStats downloadedAt={c.downloadedAt} postsCount={c.postsCount} />
                    </Grid>
                    <FeedPrimaryActionButtons query={{ account, community: c }} postsCount={c.postsCount} />
                  </Grid>
                )}
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </React.Fragment>
    );

    // const verifyingLicense = false;
    // const isFreeLicense = false;
    // const license = '71020D1F-A42846BD-861A90ED-986BC3E9';
    // const licenseLimits = { downloadPosts: -1 };
    // const activatingLicense = true;
    // const downloadLimitReached = true;

    downloadedAccounts.forEach(da => {
      const a = accounts.find(aa => aa.id === da.id);
      da.available = !!accounts.find(aa => aa.id === da.googleAccountId);
      da.email = a && a.email;
    });

    return (
      <Grid container className={classes.root}>
        {updateAvailable ? (
          <Typography variant="subtitle1" gutterBottom className={classes.updatePanel}>
            {updateDownloading ? (
              `Downloading update... ${updateDownloadingProgress}%`
            ) : (
              <React.Fragment>
                <b>New version {updateAvailable} is available.</b> Download update from{' '}
                <a href={updateDownloadUrl} onClick={this.downloadUpdate}>
                  {updateDownloadUrl}
                </a>
              </React.Fragment>
            )}
          </Typography>
        ) : null}

        <Grid container direction="column" justify="flex-start" alignItems="center" style={{ marginBottom: '10rem' }}>
          <Grid
            container
            direction="row"
            justify="space-between"
            alignItems="center"
            className={classes.accountsContainer}
            style={{ paddingTop: 0, paddingBottom: 0 }}
          >
            <Typography variant="h2" gutterBottom className={classes.title}>
              Google+ Exporter <span style={{ fontSize: '0.8rem' }}>v{process.env.VERSION}</span>
            </Typography>
            <Grid item>
              <Grid container direction="row" justify="center" alignItems="center">
                <span style={{ marginLeft: '1rem', fontSize: '0.8rem' }}>
                  {(torStatus === 'UNKNOWN' && <span />) ||
                    (!torEnabled && <span>Tor is Disabled</span>) ||
                    (torStatus === 'AVAILABLE' && <span style={{ color: '#43a047' }}>Tor is Starting...</span>) ||
                    (torStatus === 'READY' && (
                      <span style={{ color: '#43a047', fontWeight: 'bold' }}>Tor In Use</span>
                    )) || <span>Tor is Not Started</span>}
                </span>
                <PopupState variant="popover" popupId="tor-settings-popup-menu">
                  {popupState => (
                    <React.Fragment>
                      <IconButton aria-label="Tor Settings" {...bindTrigger(popupState)}>
                        <SettingsIcon fontSize="small" />
                      </IconButton>
                      <Menu {...bindMenu(popupState)}>
                        <MenuItem onClick={this.toggleTorUse({ popupState })}>
                          {torEnabled ? 'Disable' : 'Enable'} Tor
                        </MenuItem>
                      </Menu>
                    </React.Fragment>
                  )}
                </PopupState>
              </Grid>
            </Grid>
          </Grid>

          {downloadLimitReached ? (
            <MySnackbarContentWrapper
              noIcon
              noCloseIcon
              variant="error"
              message="<b>Feed download limit reached!</b><br/>Some of your feeds will not be fully downloaded.<br/><br/><b>You can buy license to download more posts.</b>"
              onClose={() => {
                this.setState({ downloadLimitReached: false });
              }}
            />
          ) : null}

          <Grid container direction="column" justify="center" className={classes.accountsContainer}>
            <Grid
              container
              direction="row"
              justify="space-between"
              alignItems="center"
              // className={classes.downloadedAccountsHeader}
            >
              {verifyingLicense ? (
                <React.Fragment>
                  <Typography variant="h6" color="textSecondary">
                    Verifying license...
                  </Typography>
                  <CircularProgress size={16} style={{ marginRight: '0.5rem' }} />
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <Grid item>
                    <Grid container direction="column" justify="space-between">
                      {isFreeLicense ? (
                        <Typography variant="body1">You{"'"}re currently using FREE license.</Typography>
                      ) : (
                        <Typography variant="h6" color="textSecondary">
                          Active License Key
                        </Typography>
                      )}
                      {licenseLimits && licenseLimits.postsPerFeed > -1 ? (
                        <Typography variant="caption" color="textSecondary">
                          Download is limited to {licenseLimits.postsPerFeed} post
                          {licenseLimits.postsPerFeed === 1 ? '' : 's'} per feed.
                        </Typography>
                      ) : null}
                    </Grid>
                  </Grid>
                  <Grid item>
                    {isFreeLicense ? (
                      <Grid container direction="row" justify="space-between">
                        <Button variant="outlined" onClick={this.openActivateLicenseDialog}>
                          Activate License
                        </Button>
                        <div style={{ marginLeft: 16 }} />
                        <button className={classes.gumroadButton} onClick={this.openLicenseBuy}>
                          <span className={classes.gumroadButtonLogo} />
                          BUY LICENSE
                        </button>
                      </Grid>
                    ) : (
                      <Button title="Copy license key to clipboard" onClick={this.copyLicenseKeyToClipboard(license)}>
                        {this.maskLicenseKey(license)}
                      </Button>
                    )}
                  </Grid>
                </React.Fragment>
              )}
            </Grid>
          </Grid>

          <Grid
            container
            direction="column"
            justify="center"
            className={classes.accountsContainer}
            style={{ marginBottom: '0.5rem', paddingTop: 0, paddingBottom: 0 }}
          >
            <Paper>
              <AppBar position="static" style={{ marginBottom: '0.5rem' }}>
                <Tabs
                  value={tabIndex}
                  onChange={(e, newTabIndex) => this.setState({ tabIndex: newTabIndex })}
                  centered
                  // indicatorColor="primary"
                  // textColor="primary"
                  // style={{ borderBottom: '1px solid rgba(156, 39, 176, 0.2)' }}
                  indicatorColor="secondary"
                  textColor="inherit"
                  variant="fullWidth"
                >
                  <Tab label="Posts" />
                  <Tab label={`Images${images.downloadable > 0 ? ` (${images.downloadable})` : ''}`} />
                  <Tab label={`Videos${videos.downloadable > 0 ? ` (${videos.downloadable})` : ''}`} />
                </Tabs>
              </AppBar>

              {/* <Tabs
                value={tabIndex}
                onChange={(e, newTabIndex) => this.setState({ tabIndex: newTabIndex })}
                centered
                indicatorColor="primary"
                textColor="primary"
                style={{ borderBottom: '1px solid rgba(156, 39, 176, 0.2)' }}
                variant="fullWidth"
              >
                <Tab label="Download Posts" />
                <Tab label={`Download Images${images.downloadable > 0 ? ` (${images.downloadable})` : ''}`} />
              </Tabs> */}

              {// videos.downloadable > 0 || videos.downloaded > 0 ? (
              tabIndex === 2 ? (
                <Grid container direction="column" justify="center" style={{ padding: '1rem' }}>
                  <List className={classes.accountsBlock}>
                    <ListItem>
                      <ListItemText
                        primary={
                          downloadingVideos
                            ? 'Videos download in progress...'
                            : `Downloaded ${videos.downloaded} videos${
                                videos.downloadedSize > 0 ? ` (${byteSize(videos.downloadedSize).toString()})` : ''
                              }`
                        }
                        secondary={
                          // eslint-disable-next-line
                          videos.downloadable > 0 && !downloadingVideos ? (
                            <Typography variant="caption" color="error" style={{ fontWeight: 'bold' }}>
                              There is {videos.downloadable} video{videos.downloadable === 1 ? '' : 's'}{' '}
                              {videos.downloadableSize > 0 ? `(${byteSize(videos.downloadableSize).toString()}) ` : ''}
                              available for download
                            </Typography>
                          ) : downloadingVideos ? null : (
                            <Typography variant="caption">All detected videos downloaded.</Typography>
                          )
                        }
                      />
                      <ListItemSecondaryAction>
                        {(downloading && downloadingVideos && (
                          <DownloadVideosProgress
                            downloadedPosts={downloadedPosts}
                            downloadedComments={downloadedComments}
                          />
                        )) || (
                          <React.Fragment>
                            <PopupState variant="popover" popupId="videos-settings-popup-menu">
                              {popupState => (
                                <React.Fragment>
                                  <IconButton aria-label="Videos Settings" {...bindTrigger(popupState)}>
                                    <SettingsIcon fontSize="small" />
                                  </IconButton>
                                  <Menu {...bindMenu(popupState)}>
                                    <MenuItem onClick={this.onChangeVideosFolder({ popupState })}>
                                      Change Videos Download Folder
                                    </MenuItem>
                                  </Menu>
                                </React.Fragment>
                              )}
                            </PopupState>
                            <Button onClick={this.openVideosFolder}>Show Videos</Button>
                            <Button
                              variant="contained"
                              color="primary"
                              disabled={disable || !isLoggedIn || videos.downloadable < 1}
                              onClick={this.onDownloadVideos()}
                              title="Download Videos"
                              style={{ marginLeft: '1rem' }}
                            >
                              Download Videos
                            </Button>
                            {videos.downloaded > 0 ? (
                              <Button
                                variant="outlined"
                                color="primary"
                                disabled={disable}
                                onClick={this.onExportVideoList()}
                                title="Export Video List"
                                style={{ marginLeft: '1rem' }}
                              >
                                {exportingVideoList ? (
                                  <React.Fragment>
                                    <CircularProgress size={16} style={{ marginRight: '1rem' }} /> Exporting List...
                                  </React.Fragment>
                                ) : (
                                  'Export List'
                                )}
                              </Button>
                            ) : null}
                          </React.Fragment>
                        )}
                      </ListItemSecondaryAction>
                    </ListItem>
                  </List>
                </Grid>
              ) : null}

              {// images.downloadable > 0 || images.downloaded > 0 ? (
              tabIndex === 1 ? (
                <Grid container direction="column" justify="center" style={{ padding: '1rem' }}>
                  <List className={classes.accountsBlock}>
                    <ListItem>
                      <ListItemText
                        primary={
                          downloadingImages
                            ? 'Images download in progress...'
                            : `Downloaded ${images.downloaded} images${
                                images.downloadedSize > 0 ? ` (${byteSize(images.downloadedSize).toString()})` : ''
                              }`
                        }
                        secondary={
                          // eslint-disable-next-line
                          images.downloadable > 0 && !downloadingImages ? (
                            <Typography variant="caption" color="error" style={{ fontWeight: 'bold' }}>
                              There is {images.downloadable} image{images.downloadable === 1 ? '' : 's'}{' '}
                              {images.downloadableSize > 0 ? `(${byteSize(images.downloadableSize).toString()}) ` : ''}
                              available for download
                            </Typography>
                          ) : downloadingImages ? null : (
                            <Typography variant="caption">All detected images downloaded.</Typography>
                          )
                        }
                      />
                      <ListItemSecondaryAction>
                        {(downloading && downloadingImages && (
                          <DownloadImagesProgress
                            downloadedPosts={downloadedPosts}
                            downloadedComments={downloadedComments}
                          />
                        )) || (
                          <React.Fragment>
                            <PopupState variant="popover" popupId="images-settings-popup-menu">
                              {popupState => (
                                <React.Fragment>
                                  <IconButton aria-label="Images Settings" {...bindTrigger(popupState)}>
                                    <SettingsIcon fontSize="small" />
                                  </IconButton>
                                  <Menu {...bindMenu(popupState)}>
                                    <MenuItem onClick={this.onChangeImagesFolder({ popupState })}>
                                      Change Images Download Folder
                                    </MenuItem>
                                  </Menu>
                                </React.Fragment>
                              )}
                            </PopupState>
                            <Button onClick={this.openImagesFolder}>Show Images</Button>
                            <Button
                              variant="contained"
                              color="primary"
                              disabled={disable || images.downloadable < 1}
                              onClick={this.onDownloadImages()}
                              title="Download Images"
                              style={{ marginLeft: '1rem' }}
                            >
                              Download Images
                            </Button>
                            {images.downloaded > 0 ? (
                              <Button
                                variant="outlined"
                                color="primary"
                                disabled={disable}
                                onClick={this.onExportImageList()}
                                title="Export Image List"
                                style={{ marginLeft: '1rem' }}
                              >
                                {exportingImageList ? (
                                  <React.Fragment>
                                    <CircularProgress size={16} style={{ marginRight: '1rem' }} /> Exporting List...
                                  </React.Fragment>
                                ) : (
                                  'Export List'
                                )}
                              </Button>
                            ) : null}
                          </React.Fragment>
                        )}
                      </ListItemSecondaryAction>
                    </ListItem>
                  </List>
                </Grid>
              ) : null}

              {tabIndex === 0 ? (
                <React.Fragment>
                  {!isLoggedIn && !detectionInProgress ? (
                    <Grid
                      container
                      direction="column"
                      justify="center"
                      alignItems="center"
                      className={classes.accountsContainer}
                    >
                      <Grid
                        container
                        direction="row"
                        justify="center"
                        alignItems="center"
                        style={{ paddingBottom: '1rem' }}
                      >
                        <Typography variant="h6" color="textSecondary">
                          You are not logged in to Google+
                        </Typography>
                      </Grid>
                      <Grid container direction="row" justify="center" alignItems="center">
                        <Button href={loginUrl} variant="contained" color="primary">
                          Login to Google+
                        </Button>
                      </Grid>
                    </Grid>
                  ) : null}

                  {isLoggedIn ? (
                    <Grid
                      container
                      direction="row"
                      justify="space-between"
                      alignItems="center"
                      style={{ paddingBottom: 0 }}
                      className={classes.accountsContainer}
                    >
                      <Button onClick={this.plusLogout} disabled={disable}>
                        Logout
                      </Button>
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={this.openUrlDialog}
                        disabled={urlDialogProps.inProgress || (torEnabled && torStatus !== 'READY')}
                      >
                        {urlDialogProps.inProgress ? <CircularProgress size={16} style={{ marginRight: 16 }} /> : null}{' '}
                        Add Google+ Profile, Page or Community Feed
                      </Button>
                    </Grid>
                  ) : null}

                  {(downloadedAccounts.length && (
                    <Grid container direction="column" justify="center" className={classes.accountsContainer}>
                      <Grid
                        container
                        direction="row"
                        justify="space-between"
                        alignItems="center"
                        style={{ marginBottom: 32 }}
                      >
                        <Grid item>
                          <Grid container direction="row" justify="center" alignItems="center">
                            <Button onClick={this.openExportsFolder}>Show Exports</Button>
                            <PopupState variant="popover" popupId="google-plus-feeds-settings-popup-menu">
                              {popupState => (
                                <React.Fragment>
                                  <IconButton aria-label="Google+ Feeds Settings" {...bindTrigger(popupState)}>
                                    <SettingsIcon fontSize="small" />
                                  </IconButton>
                                  <Menu {...bindMenu(popupState)}>
                                    <MenuItem onClick={this.onChangeExportFolder({ popupState })}>
                                      Change Export Folder
                                    </MenuItem>
                                  </Menu>
                                </React.Fragment>
                              )}
                            </PopupState>
                          </Grid>
                        </Grid>
                        <Grid item>
                          <Grid container direction="row" justify="center" alignItems="center">
                            <Button
                              variant="outlined"
                              color="primary"
                              aria-label="Refresh All Feeds"
                              title="Refresh All Feeds"
                              style={{ marginLeft: '1rem' }}
                              disabled={this.isRefreshAllDisabled()}
                              onClick={this.onRefreshFeeds}
                            >
                              Refresh All
                            </Button>
                            <Button
                              variant="outlined"
                              color="primary"
                              aria-label="Download All Feeds"
                              title="Download All Feeds"
                              style={{ marginLeft: '1rem' }}
                              disabled={disable || !isLoggedIn || (torEnabled && torStatus !== 'READY')}
                              onClick={this.onDownloadFeeds}
                            >
                              Download All
                            </Button>
                            <Button
                              variant="contained"
                              color="primary"
                              disabled={disable || this.isRefreshAllDisabled(true)}
                              onClick={this.onFullJsonExport()}
                              style={{ marginLeft: '1rem' }}
                              title="Export all posts to JSON file"
                            >
                              Full JSON Export
                            </Button>
                          </Grid>
                        </Grid>
                      </Grid>

                      <List className={classes.accountsBlock}>
                        {downloadedAccounts.map((a, aidx) => (
                          <React.Fragment key={a.id}>
                            {aidx > 0 ? <Divider className={classes.accountsDivider} /> : null}
                            <ListItem>
                              <ListItemAvatar>
                                <Avatar alt={a.name} src={a.image} />
                              </ListItemAvatar>
                              <ListItemText
                                primary={a.name}
                                // primary={
                                //   <Grid container direction="row" justify="flex-start" alignItems="baseline">
                                //     <Typography variant="subheading" color="textPrimary">
                                //       {a.name}
                                //     </Typography>
                                //     {a.email ? (
                                //       <Typography variant="caption" color="textSecondary" style={{ marginLeft: '0.5rem' }}>
                                //         {'/ '}
                                //         {a.email}
                                //       </Typography>
                                //     ) : null}
                                //   </Grid>
                                // }
                                secondary={
                                  detectionInProgress && !a.available ? (
                                    <Typography variant="caption" color="textSecondary">
                                      Account detection in progress...
                                    </Typography>
                                  ) : (
                                    <Typography variant="caption" color="textSecondary">
                                      {a.type === 'PAGE'
                                        ? 'Google+ Page'
                                        : `Google+ Profile${a.email ? ` / ${a.email}` : ''}`}
                                    </Typography>
                                  )
                                }
                              />
                              <ListItemSecondaryAction>
                                {(exporting && exportingAccount && exportingAccount.id === a.id && (
                                  <Grid container className={classes.progressBlock} direction="row" justify="center">
                                    <CircularProgress size={16} />
                                  </Grid>
                                )) ||
                                  (downloading && downloadingAccount && downloadingAccount.id === a.id && (
                                    <DownloadProgress />
                                  )) || (
                                    <Grid container direction="row" justify="flex-start" alignItems="center">
                                      <Grid item>
                                        <FeedStats downloadedAt={a.downloadedAt} postsCount={a.postsCount} />
                                      </Grid>
                                      <FeedPrimaryActionButtons query={{ account: a }} postsCount={a.postsCount} />
                                    </Grid>
                                  )}
                              </ListItemSecondaryAction>
                            </ListItem>

                            {a.collections.length ? (
                              <React.Fragment>
                                <Divider component="li" className={classes.nestedDivider} />
                                <li>
                                  <Typography
                                    className={classes.nestedDividerLabel}
                                    color="textSecondary"
                                    variant="caption"
                                  >
                                    Collections
                                  </Typography>
                                </li>
                              </React.Fragment>
                            ) : null}

                            {a.collections.map(c => (
                              <ListItem key={c.id} className={classes.nested}>
                                <ListItemAvatar>
                                  <Avatar alt={c.name} src={c.image} />
                                </ListItemAvatar>
                                <ListItemText
                                  primary={c.name}
                                  secondary={
                                    <Typography variant="caption" color="textSecondary">
                                      Google+ Collection
                                    </Typography>
                                  }
                                />
                                <ListItemSecondaryAction>
                                  {(exporting && exportingCollection && exportingCollection.id === c.id && (
                                    <Grid container className={classes.progressBlock} direction="row" justify="center">
                                      <CircularProgress size={16} />
                                    </Grid>
                                  )) ||
                                    (downloading && downloadingCollection && downloadingCollection.id === c.id && (
                                      <DownloadProgress />
                                    )) || (
                                      <Grid container direction="row" justify="flex-start" alignItems="center">
                                        <Grid item>
                                          <FeedStats downloadedAt={c.downloadedAt} postsCount={c.postsCount} />
                                        </Grid>
                                        <FeedPrimaryActionButtons
                                          query={{ account: a, collection: c }}
                                          postsCount={c.postsCount}
                                        />
                                      </Grid>
                                    )}
                                </ListItemSecondaryAction>
                              </ListItem>
                            ))}

                            <Communities
                              title="Communities You Own"
                              account={a}
                              communities={a.communities.filter(c => c.membership === 'OWNER')}
                            />
                            <Communities
                              title="Communities You Moderate"
                              account={a}
                              communities={a.communities.filter(c => c.membership === 'MODERATOR')}
                            />
                            <Communities
                              title="Communities You're a Member of"
                              account={a}
                              communities={a.communities.filter(
                                c => ['MODERATOR', 'OWNER'].indexOf(c.membership) === -1
                              )}
                            />
                          </React.Fragment>
                        ))}
                      </List>
                    </Grid>
                  )) ||
                    null}

                  {(detectionInProgress && (
                    <Grid
                      container
                      direction="row"
                      justify="center"
                      alignItems="center"
                      style={{ marginTop: '2rem', marginBottom: '2rem' }}
                    >
                      <Grid container direction="column" justify="center" alignItems="center">
                        <CircularProgress size={32} />
                        <Typography variant="caption" color="textSecondary" style={{ marginTop: '1rem' }}>
                          Updating Google+ Feeds List...
                        </Typography>
                      </Grid>
                    </Grid>
                  )) ||
                    null}
                </React.Fragment>
              ) : null}
            </Paper>
          </Grid>
        </Grid>

        <Snackbar
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'center'
          }}
          open={isSnackbarOpen}
          autoHideDuration={20000}
          ClickAwayListenerProps={{ mouseEvent: false, touchEvent: false }}
          onClose={this.closeSnackbar}
        >
          <MySnackbarContentWrapper onClose={this.closeSnackbar} variant={snackbarVariant} message={snackbarMessage} />
        </Snackbar>

        <Dialog
          open={activateLicenseOpen}
          onClose={this.handleCloseActivateLicenseDialog}
          aria-labelledby="activate-license-dialog-title"
        >
          <DialogTitle id="activate-license-title">License Key Activation</DialogTitle>
          <DialogContent>
            <DialogContentText>Please enter the license key you have received from us.</DialogContentText>
            <TextField
              disabled={activatingLicense}
              autoFocus
              margin="normal"
              id="licenseKey"
              label="License Key"
              type="text"
              fullWidth
              value={activateLicenseKey}
              onChange={this.handleActivateLicenseChange}
              onKeyDown={e => {
                if (e.keyCode === 13) {
                  this.activateLicenseKey();
                }
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={this.handleCloseActivateLicenseDialog} disabled={activatingLicense}>
              Cancel
            </Button>
            <Button
              onClick={this.activateLicenseKey}
              disabled={activatingLicense || activateLicenseKey.length === 0}
              variant="contained"
              color="primary"
            >
              {activatingLicense ? <CircularProgress size={16} style={{ marginRight: 16 }} /> : null} Activate License
              Key
            </Button>
          </DialogActions>
        </Dialog>

        <ExportDialog
          exportSource={exportSource}
          isOpen={exportDialogOpen}
          onClose={this.handleCloseExportDialog}
          onExportPosts={this.startExport}
        />

        <UrlDialog {...urlDialogProps} />

        <style jsx>{`
          h1 {
            font-size: 2rem;
          }
          .center {
            text-align: center;
          }
        `}</style>
        <style jsx global>{`
          html,
          body {
            width: 100%;
            height: 100%;
            min-height: 100%;
          }
          body {
            font: caption;
          }
        `}</style>
      </Grid>
    );
  }
}

Index.propTypes = {
  classes: PropTypes.object.isRequired // eslint-disable-line
};

export default withStyles(styles)(Index);
