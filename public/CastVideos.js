var cast = {}

    var castNow = function() {
      console.log('casting!')
      var sessionRequest = new chrome.cast.SessionRequest(chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID);
      chrome.cast.requestSession(function onRequestSessionSuccess(session) {
        console.log('Session success', session)
        cast.session = session
      }, function onLaunchError(er) {
        console.log('onLaunchError', er)
      }, sessionRequest);

      setTimeout(function() {
        var sessionRequest = new chrome.cast.SessionRequest(chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID);
        chrome.cast.requestSession(function onRequestSessionSuccess(session) {
          console.log('Session success', session)
          cast.session = session
        }, function onLaunchError(er) {
          console.log('onLaunchError', er)
        }, sessionRequest);

      }, 1000)

    }


    var loadNow = function() {


    //   var englishSubtitle = new chrome.cast.media.Track(1, // track ID
    //     chrome.cast.media.TrackType.TEXT);
    //   englishSubtitle.trackContentId = 'https://carlosguerrero.com/captions_styled.vtt';
    //   englishSubtitle.trackContentType = 'text/vtt';
    //   englishSubtitle.subtype = chrome.cast.media.TextTrackType.SUBTITLES;
    //   englishSubtitle.name = 'English Subtitles';
    //   englishSubtitle.language = 'en-US';
    //   englishSubtitle.customData = null;


      console.log('LoadNow, session:', cast.session)
      var mediaInfo = new chrome.cast.media.MediaInfo('http://commondatastorage.googleapis.com/gtv-videos-bucket/big_buck_bunny_1080p.mp4', 'video/mp4');
    //   mediaInfo.tracks = [englishSubtitle]
      mediaInfo.activeTrackIds = [1]
      request = new chrome.cast.media.LoadRequest(mediaInfo);
      cast.session.loadMedia(request,
        onMediaDiscovered.bind(this, 'loadMedia'),
        function(er) {
          console.log('onMediaError', er)
        });

      function onMediaDiscovered(how, media) {
        console.log('got media!', media)
        cast.currentMedia = media;
        var activeTrackIds = [1];
        var tracksInfoRequest = new chrome.cast.media.EditTracksInfoRequest(activeTrackIds);
        media.editTracksInfo(tracksInfoRequest, function succCB(){console.log('success changing trackIDs!')}, function errorCallback(){
          console.log('Error CB!')
        });
      }
    }

    initializeCastApi = function() {

      console.log('initializing cast api')
      var sessionRequest = new chrome.cast.SessionRequest(chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID);
      var apiConfig = new chrome.cast.ApiConfig(sessionRequest,
        function(session) {
          console.log('got session', session)
          cast.session = session
        },
        function receiverListener(e) {
          if (e === chrome.cast.ReceiverAvailability.AVAILABLE) {
            console.log('receiver is available :)')
          }
        })

      chrome.cast.initialize(apiConfig, function() {
          console.log('got initSuccess')
        },
        function(gotError) {
          console.log('gotError', gotError)
        });
    };

    window.onload = function() {
      window['__onGCastApiAvailable'] = function(loaded, errorInfo) {
        console.log('in __onGCastApiAvailable, loaded:', loaded)
        if (loaded) {
          initializeCastApi()
        }
      };
    }