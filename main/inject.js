/* eslint-disable import/no-extraneous-dependencies */
/*  global document, window */
const { ipcRenderer, remote } = require('electron');
const vm = require('vm');

const electronSession = remote.session;
const cookieUrl = 'https://google.com/';
const cookieNames = ['HSID', 'SSID', 'APISID', 'SAPISID', 'SID', 'NID'];

const queryProfileButton = () =>
  document.querySelector(
    [
      // update 13.03.2019
      '.gb_x.gb_Da.gb_f',
      // update 06.03.2019
      '.gb_Ea.gb_Tc.gb_f',
      // update 28.02.2019
      '.gb_Ea.gb_Tc.gb_pg.gb_f',
      // update 01.08.2017 more universal
      '.gb_R .gbii',
      // update 01.08.2017
      '.gb_b.gb_cb.gb_R .gb_7a.gbii',
      // update 27.01.2017
      '.gb_b.gb_eb.gb_R .gb_9a.gbii',
      // update 17.11.2016
      '.gb_b.gb_db.gb_R .gb_8a.gbii',
      // first release
      '.gb_tc.gb_hb.gb_R .gb_8a.gbii'
    ].find(s => document.querySelector(s))
  );

const queryAccountInfo = () => {
  // spanish <div class="gb_vb gb_aa gb_g" aria-label="Información de la cuenta" aria-hidden="false" img-loaded="1"><div class="gb_yb"><a class="gb_zb gb_fg gb_Bb" aria-label="Cambiar la foto de perfil" href="https://plus.google.com/u/0/me?authuser=0"><div class="gb_Cb gbip" title="Perfil"></div><span class="gb_mb">Cambiar</span></a><div class="gb_Ab"><div class="gb_Db gb_Eb">Alois Bělaška</div><div class="gb_Fb">alois.belaska@gmail.com</div><div class="gb_xb"><a href="https://plus.google.com/u/0/me?authuser=0" target="_blank">Perfil de Google+</a><span aria-hidden="true">–</span><a href="https://myaccount.google.com/privacypolicy" target="_blank">Privacidad</a></div><a class="gb_za gb_cg gbp1 gb_Ze gb_Hb" href="https://myaccount.google.com/?utm_source=OGB&amp;authuser=0&amp;utm_medium=act" target="_blank">Cuenta de Google</a></div></div><div class="gb_Mb"><div class="gb_Ob" aria-hidden="false"><a class="gb_Qb gb_Xb" href="/?authuser=0&amp;pageId=none"><img class="gb_0b gb_Bb" src="https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAAAAAA/AGDgw-i4K4R6k6-_Spmn8h628d9H-scMZw/s48-c-mo/photo.jpg" alt="Perfil"><div class="gb_Sb"><div class="gb_1b">Alois Bělaška</div><div class="gb_2b" dir="ltr">alois.belaska@gmail.com (predeterminado)</div></div></a><a class="gb_Qb" href="/?authuser=1&amp;pageId=none"><img class="gb_0b gb_Bb" src="https://lh3.googleusercontent.com/-vNuMu0Q_SSo/AAAAAAAAAAI/AAAAAAAAAAA/AGDgw-hNPqxUoO0hy6AxdzsOWZQ8FAHGLg/s48-c-mo/photo.jpg" alt="Perfil"><div class="gb_Sb"><div class="gb_1b">Alois Bělaška</div><div class="gb_2b" dir="ltr">alois@loysoft.uk</div></div></a><a class="gb_Qb" href="/?authuser=2&amp;pageId=none"><img class="gb_0b gb_Bb" src="https://lh3.googleusercontent.com/-TfGhOHzBWx8/AAAAAAAAAAI/AAAAAAAAAAA/AGDgw-jzq11vMP2QE8cSzp1Oo44o9Spk5g/s48-c-mo/photo.jpg" alt="Perfil"><div class="gb_Sb"><div class="gb_1b">Všichni Bělaškovi</div><div class="gb_2b" dir="ltr">vsichni@belaskovi.com</div></div></a><a class="gb_Qb" href="/?authuser=0&amp;pageId=108087756774527107581"><img class="gb_0b gb_Bb" src="https://lh3.googleusercontent.com/-q3kJ9EyeIeM/AAAAAAAAAAI/AAAAAAAAAAA/AGDgw-gJvOFdH4Kove9dLPlTlRK-DVj1Lw/s48-c-mo/photo.jpg" alt=""><div class="gb_Sb"><div class="gb_1b">FPMTest</div><div class="gb_2b" dir="ltr">Cuenta de marca</div></div></a><a class="gb_Qb" href="/?authuser=0&amp;pageId=114215148605297174549"><img class="gb_0b gb_Bb" src="https://lh3.googleusercontent.com/-UdKvA6BTEhQ/AAAAAAAAAAI/AAAAAAAAAAA/AGDgw-iY2IHfvp6exVhSkFPoQIof7sYm3g/s48-c-mo/photo.jpg" alt=""><div class="gb_Sb"><div class="gb_1b">Draft</div><div class="gb_2b" dir="ltr">Cuenta de marca</div></div></a><a class="gb_Qb" href="/?authuser=0&amp;pageId=109692729202394944370"><img class="gb_0b gb_Bb" src="https://lh3.googleusercontent.com/-E9q8TTGLt5s/AAAAAAAAAAI/AAAAAAAAAAA/AGDgw-gtFCdWPJqZJAhj8NBYU4xh_RXSIA/s48-c-mo/photo.jpg" alt=""><div class="gb_Sb"><div class="gb_1b">The Queue IO</div><div class="gb_2b" dir="ltr">Cuenta de marca</div></div></a><a class="gb_Qb" href="/?authuser=0&amp;pageId=105750980959577516811"><img class="gb_0b gb_Bb" src="https://lh3.googleusercontent.com/-dHBGGCq7AD4/AAAAAAAAAAI/AAAAAAAAAAA/AGDgw-hqg8Q83As_b87UVEg1X1vxaHFbeQ/s48-c-mo/photo.jpg" alt=""><div class="gb_Sb"><div class="gb_1b">Friends+Me</div><div class="gb_2b" dir="ltr">Cuenta de marca</div></div></a><a class="gb_Qb" href="/?authuser=0&amp;pageId=113544734326063431494"><img class="gb_0b gb_Bb" src="https://lh3.googleusercontent.com/-yE6stSSFBjo/AAAAAAAAAAI/AAAAAAAAAAA/AGDgw-jjH1JtxAT69OnpfIP6lZ_mnIpbCw/s48-c-mo/photo.jpg" alt=""><div class="gb_Sb"><div class="gb_1b">Loy software s.r.o.</div><div class="gb_2b" dir="ltr">Cuenta de marca</div></div></a></div><a class="gb_4b" href="https://myaccount.google.com/brandaccounts?authuser=0&amp;continue=https://plus.google.com/&amp;service=/%3Fauthuser%3D%24authuser%26pageId%3D%24pageId" aria-hidden="false"><span class="gb_5b gb_gc"></span><div class="gb_6b">Todas sus cuentas de marca</div></a></div><div class="gb_nb gb_8a"><div class="gb_ob"></div></div><div class="gb_Ib"><div><a class="gb_za gb_bg gb_Ze gb_Hb" href="https://accounts.google.com/AddSession?continue=https://plus.google.com/">Agregar una cuenta</a></div><div><a class="gb_za gb_dg gb_jg gb_Ze gb_Hb" id="gb_71" href="https://accounts.google.com/Logout" target="_top">Salir</a></div></div></div>
  // JP <div class="gb_xb gb_ba gb_g" aria-label="アカウント情報" aria-hidden="false" img-loaded="1"><div class="gb_Ab"><a class="gb_Bb gb_rg" aria-label="プロフィール画像を変更します。" href="https://plus.google.com/u/0/me?authuser=0"><div class="gb_Eb" style="position:relative"><div class="gb_Fb gbip" title="プロフィール"></div><span class="gb_ob">変更</span></div></a><div class="gb_Cb"><div class="gb_Jb gb_Kb">Alois Bělaška</div><div class="gb_Lb">alois.belaska@gmail.com</div><div class="gb_zb"><a href="https://plus.google.com/u/0/me?authuser=0" target="_blank">Google+ プロフィール</a><span aria-hidden="true">–</span><a href="https://myaccount.google.com/privacypolicy" target="_blank">プライバシー</a></div><a class="gb_Aa gb_og gbp1 gb_8e gb_Mb" href="https://myaccount.google.com/?utm_source=OGB&amp;authuser=0&amp;utm_medium=act" target="_blank">Google アカウント</a></div></div><div class="gb_Vb"><div class="gb_Xb" aria-hidden="false"><a class="gb_0b gb_7b" href="/?authuser=0&amp;pageId=none"><img class="gb_9b gb_Eb" src="https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAAAAAA/AKxrwcailR5HGOOUFFBNhY-nkJs-FfwgIA/s48-c-mo/photo.jpg" alt="プロフィール"><div class="gb_2b"><div class="gb_ac">Alois Bělaška</div><div class="gb_bc" dir="ltr">alois.belaska@gmail.com（デフォルト）</div></div></a><a class="gb_0b" href="/?authuser=1&amp;pageId=none"><img class="gb_9b gb_Eb" src="https://lh3.googleusercontent.com/-vNuMu0Q_SSo/AAAAAAAAAAI/AAAAAAAAAAA/AKxrwcYctJQoPB4uloKBqpoz8X7QDV3qUA/s48-c-mo/photo.jpg" alt="プロフィール"><div class="gb_2b"><div class="gb_ac">Alois Bělaška</div><div class="gb_bc" dir="ltr">alois@loysoft.uk</div></div></a><a class="gb_0b" href="/?authuser=2&amp;pageId=none"><img class="gb_9b gb_Eb" src="https://lh3.googleusercontent.com/-TfGhOHzBWx8/AAAAAAAAAAI/AAAAAAAAAAA/AKxrwcYBm8tTmL8ic24FE5j_CWre2o5xuQ/s48-c-mo/photo.jpg" alt="プロフィール"><div class="gb_2b"><div class="gb_ac">Všichni Bělaškovi</div><div class="gb_bc" dir="ltr">vsichni@belaskovi.com</div></div></a><a class="gb_0b" href="/?authuser=0&amp;pageId=108087756774527107581"><img class="gb_9b gb_Eb" src="https://lh3.googleusercontent.com/-q3kJ9EyeIeM/AAAAAAAAAAI/AAAAAAAAAAA/AKxrwcaaGAg4NUmWQqykbBwrMmt8rWBDyg/s48-c-mo/photo.jpg" alt=""><div class="gb_2b"><div class="gb_ac">FPMTest</div><div class="gb_bc" dir="ltr">ブランド アカウント</div></div></a><a class="gb_0b" href="/?authuser=0&amp;pageId=114215148605297174549"><img class="gb_9b gb_Eb" src="https://lh3.googleusercontent.com/-UdKvA6BTEhQ/AAAAAAAAAAI/AAAAAAAAAAA/AKxrwcbMvytuwtD9wlHKtuhfHrxQwI3s4g/s48-c-mo/photo.jpg" alt=""><div class="gb_2b"><div class="gb_ac">Draft</div><div class="gb_bc" dir="ltr">ブランド アカウント</div></div></a><a class="gb_0b" href="/?authuser=0&amp;pageId=109692729202394944370"><img class="gb_9b gb_Eb" src="https://lh3.googleusercontent.com/-E9q8TTGLt5s/AAAAAAAAAAI/AAAAAAAAAAA/AKxrwcb13hcG0rWpUZOdMFaFXs9V0gEFmA/s48-c-mo/photo.jpg" alt=""><div class="gb_2b"><div class="gb_ac">The Queue IO</div><div class="gb_bc" dir="ltr">ブランド アカウント</div></div></a><a class="gb_0b" href="/?authuser=0&amp;pageId=105750980959577516811"><img class="gb_9b gb_Eb" src="https://lh3.googleusercontent.com/-dHBGGCq7AD4/AAAAAAAAAAI/AAAAAAAAAAA/AKxrwcbJWdLzYDdKCeOlgHb0LR9ESL2Jcg/s48-c-mo/photo.jpg" alt=""><div class="gb_2b"><div class="gb_ac">Friends+Me</div><div class="gb_bc" dir="ltr">ブランド アカウント</div></div></a><a class="gb_0b" href="/?authuser=0&amp;pageId=113544734326063431494"><img class="gb_9b gb_Eb" src="https://lh3.googleusercontent.com/-yE6stSSFBjo/AAAAAAAAAAI/AAAAAAAAAAA/AKxrwcYGYruReNdD4ZzdQrlcbp7zoFRNRw/s48-c-mo/photo.jpg" alt=""><div class="gb_2b"><div class="gb_ac">Loy software s.r.o.</div><div class="gb_bc" dir="ltr">ブランド アカウント</div></div></a></div><a class="gb_dc" href="https://myaccount.google.com/brandaccounts?authuser=0&amp;continue=https://plus.google.com/&amp;service=/%3Fauthuser%3D%24authuser%26pageId%3D%24pageId" aria-hidden="false"><span class="gb_ec gb_qc"></span><div class="gb_fc">すべてのブランド アカウント »</div></a></div><div class="gb_tg gb_pb gb_ab"><div class="gb_qb"></div></div><div class="gb_Nb"><div><a class="gb_Aa gb_ng gb_8e gb_Mb" href="https://accounts.google.com/AddSession?continue=https://plus.google.com/">アカウントを追加</a></div><div><a class="gb_Aa gb_pg gb_wg gb_8e gb_Mb" id="gb_71" href="https://accounts.google.com/Logout" target="_top">ログアウト</a></div></div></div>
  const query = [
    // update 04.03.2019
    '.gb_Ta.gb_z > div',
    // update 28.02.2019
    '.gb_Ta.gb_z.gb_Ob > div',
    // JP update 12.12.2018
    '.gb_ba.gb_g > div',
    // update 10.12.2018
    '.gb_wb.gb_ba.gb_g > div',
    // DE,FR,SP update 27.11.2018
    '.gb_vb.gb_aa.gb_g > div',
    // update 02.08.2018
    '.gb_tb.gb_aa > div',
    // update 05.12.2017
    '.gb_sb.gb_fa > div',
    // update 05.12.2017
    '.gb_sb.gb_fa.gb_g > div',
    // update 05.12.2017
    '.gb_rb.gb_fa > div',
    // update 05.09.2017
    '.gb_nb.gb_fa.gb_g > div',
    // update 06.08.2017
    '.gb_eb.gb_Wc.gb_R .gb_lb.gb_fa > div',
    // update 03.08.2017
    '.gb_fb.gb_Xc.gb_jg.gb_R .gb_mb.gb_ga > div',
    // update 02.08.2017
    '.gb_eb.gb_Wc.gb_ig.gb_R .gb_lb.gb_fa > div',
    // update 19.02.2017
    '[aria-label="Account Information"] > div',
    // update 05.12.2017
    '.gb_fa > div'
  ].find(s => document.querySelectorAll(s).length > 0);
  const divs = document.querySelectorAll(query);

  const found = divs.length > 0;
  const isGoogleApp = found && divs.length > 4;
  const accInfoEl = (found && document.querySelector(`${query}:nth-child(${isGoogleApp ? 3 : 2})`)) || null;
  const profileEl = accInfoEl && accInfoEl.previousSibling;
  return { accInfoEl, profileEl, isGoogleApp };
};

const cookiePromise = Promise.all(
  cookieNames.map(name => {
    return new Promise((resolve, reject) => {
      electronSession.defaultSession.cookies.get({ url: cookieUrl, name }, (err, cookies) => {
        if (err) {
          return reject(err);
        }
        const value = cookies && cookies.length && cookies[0] && cookies[0].value;
        resolve(value && `${name}=${value}`);
      });
    });
  })
);

const convertReplyToJs = js => {
  try {
    return vm.runInThisContext(js);
  } catch (e) {
    console.error('convertReplyToJs error', e);
    return null;
  }
};

const convertInitDataCallbackReplyToJs = js => {
  try {
    return vm.runInThisContext(`function AF_initDataCallback(c){return c.data();};localvar=${js}`);
  } catch (e) {
    console.error('convertInitDataCallbackReplyToJs error', e);
    return null;
  }
};

const fixImage = image => {
  if (image && image.indexOf('//') === 0) {
    return `https:${image}`;
  }
  return image;
};

const waitForEl = (name, find, check, maxMs, delayMs, callback) => {
  let counter = Math.round(maxMs / delayMs);
  let checkTimer = setInterval(() => {
    try {
      const el = find();
      if (check(el) || --counter === 0) {
        clearInterval(checkTimer);
        checkTimer = null;
        callback(el);
      }
    } catch (error) {
      console.error(`waitForEl(${name}) error`, error);
    }
  }, delayMs);
};

function initialize(config) {
  const { accountIdx } = config;
  const scriptArray = [].slice
    .call(window.document.documentElement.getElementsByTagName('script'))
    .filter(e => /^window\.WIZ_global_data/.test(e.innerHTML))
    .map(e => e.innerHTML);
  const script = scriptArray && scriptArray.length && scriptArray[0];
  const data = convertReplyToJs(script);
  const fsid = data && data.FdrFJe;
  const session = data && data.SNlM0e;
  const actorId = data && data.S06Grb;
  const detectedAccountIdx = data && data.QrtxK && parseInt(data.QrtxK, 10);
  const isSignedIn = !!(session && actorId);

  if (!isSignedIn) {
    return ipcRenderer.send('plus-detection', {
      error: { message: 'Not signed-in', code: 'not_signed_in' },
      success: false,
      event: 'initialized',
      accountIdx: detectedAccountIdx || accountIdx
    });
  }

  waitForEl('query-profile-button', queryProfileButton, el => !!el, 20 * 1000, 200, profilebuttonEl => {
    if (!profilebuttonEl) {
      return ipcRenderer.send('plus-detection', {
        error: { message: 'Profile button to click not found', code: 'profile_button_not_found' },
        success: false,
        event: 'initialized',
        accountIdx: detectedAccountIdx || accountIdx
      });
    }

    profilebuttonEl.click();

    waitForEl(
      'query-account-info',
      queryAccountInfo,
      ({ accInfoEl, profileEl }) => !!accInfoEl,
      30 * 1000,
      200,
      ({ accInfoEl, profileEl, isGoogleApp }) => {
        if (!accInfoEl) {
          return ipcRenderer.send('plus-detection', {
            error: { message: 'Account info not detected', code: 'account_info_not_found' },
            success: false,
            event: 'initialized',
            accountIdx: detectedAccountIdx || accountIdx
          });
        }

        let profileImage;
        let profileName;
        let profileEmail;
        if (profileEl) {
          let imageEl = profileEl.querySelector(
            [
              // update 05.12.2017
              '.gb_Lb.gb_8a a:first-of-type > img',
              // update 05.12.2017
              '.gb_Lb a:first-of-type > img',
              // update 02.08.2017
              '.gb_Db.gb_5a a:first-of-type > img'
            ].find(s => profileEl.querySelector(s))
          );
          profileImage = imageEl && imageEl.getAttribute('src');
          // old
          if (!profileImage) {
            imageEl = profileEl.querySelector(
              [
                // update 10.12.2018
                'a .gbip',
                'a .gb_Db .gb_Eb.gbip',
                // update 28.11.2018
                'a .gb_Bb .gb_Cb.gbip',
                'a:first-of-type > div:first-child'
              ].find(s => profileEl.querySelector(s))
            );
            const style = imageEl && window.getComputedStyle(imageEl, null);
            const backgroundImage = style && style.backgroundImage;
            if (backgroundImage && backgroundImage.indexOf('url(') === 0) {
              const parts = backgroundImage.split('"');
              profileImage = parts.length === 3 && parts[1];
            }
          }

          let nameEl = profileEl.querySelector(
            [
              // update 28.02.2019
              '.gb_3a .gb_9a.gb_ab',
              // update 17.1.2018
              '.gb_Fb .gb_Mb.gb_Nb',
              // update 13.1.2019
              '.gb_Hb .gb_Nb.gb_Ob',
              // update 6.1.2019
              '.gb_Fb .gb_Lb.gb_Mb',
              // update 11.12.2018
              '.gb_Cb .gb_Jb.gb_Kb',
              // update 10.12.2018
              '.gb_Bb .gb_Fb.gb_Hb',
              // update 28.11.2018
              '.gb_Ab .gb_Db.gb_Eb',
              // update 05.12.2017
              '.gb_Lb.gb_8a a:first-of-type > div > div:nth-child(1)',
              // update 05.12.2017
              '.gb_Lb a:first-of-type > div > div:nth-child(1)',
              // update 02.08.2017
              '.gb_Db.gb_5a a:first-of-type > div > div:nth-child(1)'
            ].find(s => profileEl.querySelector(s))
          );
          profileName = (nameEl && nameEl.innerHTML) || '';
          if (!profileName && profileEl.parentElement) {
            nameEl = profileEl.parentElement.querySelector('div:nth-child(1) > div > div');
          }
          profileName = (nameEl && nameEl.innerHTML) || '';
          profileEmail = ((nameEl && nameEl.nextSibling && nameEl.nextSibling.innerHTML) || '').split(' ')[0];
          if (!profileName) {
            // old
            nameEl = profileEl && profileEl.querySelector('div:first-of-type > div:first-child');
            profileName = (nameEl || {}).innerHTML;
            profileEmail = ((nameEl && nameEl.nextSibling) || {}).innerHTML;
          }
        }

        const profile = profileImage !== null &&
          profileImage !== undefined &&
          profileName !== null &&
          profileName !== undefined && {
            id: actorId,
            image: profileImage,
            email: profileEmail,
            name: profileName
          };

        if (!profile) {
          return ipcRenderer.send('plus-detection', {
            error: { message: 'Profile not detected', code: 'profile_not_found' },
            success: false,
            event: 'initialized',
            accountIdx: detectedAccountIdx || accountIdx
          });
        }

        waitForEl(
          'query-pages',
          () => accInfoEl.querySelectorAll('a'),
          els => els && !![].slice.call(els).filter(e => /pageId=[0-9]+/.test(e.href)).length,
          15 * 1000,
          200,
          pagesEls => {
            const pages =
              (pagesEls &&
                [].slice
                  .call(pagesEls)
                  .filter(e => /pageId=[0-9]+/.test(e.href))
                  .map(e => {
                    const pageId = e.href.match(/pageId=([0-9]+)/)[1];
                    const image = fixImage((e.querySelector('img') || {}).src);
                    const name = (e.querySelector('div > div:first-child') || {}).innerHTML;
                    return {
                      image,
                      name,
                      id: pageId
                    };
                  })) ||
              [];

            cookiePromise
              .then(d => {
                const cookie = d && d.filter(v => v).join('; ');
                const success = !!(session && actorId && cookie && profile);
                ipcRenderer.send('plus-detection', {
                  success,
                  fsid,
                  pages,
                  session,
                  cookie,
                  profile,
                  event: 'initialized',
                  accountIdx: detectedAccountIdx || accountIdx
                });
              })
              .catch(error => {
                ipcRenderer.send('plus-detection', {
                  error,
                  success: false,
                  event: 'initialized',
                  accountIdx: detectedAccountIdx || accountIdx
                });
              });
          }
        );
      }
    );
  });
}

function start(config) {
  if (window.inject_initialized) return;
  window.inject_initialized = true;

  const { accountIdx } = config;

  ipcRenderer.send('plus-detection', { accountIdx, event: 'injected' });

  ipcRenderer.on('hide-page', () => {
    window.document.documentElement.style.opacity = 0;
  });

  initialize(config);
}
