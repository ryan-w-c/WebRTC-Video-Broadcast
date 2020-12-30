const peerConnections = {};
const config = {
  iceServers: [
    { 
      "urls": "stun:stun.l.google.com:19302",
    },
    // { 
    //   "urls": "turn:TURN_IP?transport=tcp",
    //   "username": "TURN_USERNAME",
    //   "credential": "TURN_CREDENTIALS"
    // }
  ]
};

const socket = io.connect(window.location.origin);

socket.on("answer", (id, description) => {
  peerConnections[id].setRemoteDescription(description);
});

socket.on("watcher", id => {
  const peerConnection = new RTCPeerConnection(config);
  peerConnections[id] = peerConnection;

  let stream = videoElement.srcObject;
  stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit("candidate", id, event.candidate);
    }
  };

  peerConnection
    .createOffer()
    .then(sdp => peerConnection.setLocalDescription(CodecsHandler.preferCodecStarter(sdp, 'vp9')))
    .then(() => {
      socket.emit("offer", id, peerConnection.localDescription);
    });
});

socket.on("candidate", (id, candidate) => {
  peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on("disconnectPeer", id => {
  peerConnections[id].close();
  delete peerConnections[id];
});

window.onunload = window.onbeforeunload = () => {
  socket.close();
};

// Get camera and microphone
const videoElement = document.querySelector("video");
const audioSelect = document.querySelector("select#audioSource");
const videoSelect = document.querySelector("select#videoSource");

audioSelect.onchange = getStream;
videoSelect.onchange = getStream;

getStream()
  .then(getDevices)
  .then(gotDevices);

function getDevices() {
  return navigator.mediaDevices.enumerateDevices();
}

function gotDevices(deviceInfos) {
  window.deviceInfos = deviceInfos;
  for (const deviceInfo of deviceInfos) {
    const option = document.createElement("option");
    option.value = deviceInfo.deviceId;
    if (deviceInfo.kind === "audioinput") {
      option.text = deviceInfo.label || `Microphone ${audioSelect.length + 1}`;
      audioSelect.appendChild(option);
    } else if (deviceInfo.kind === "videoinput") {
      option.text = deviceInfo.label || `Camera ${videoSelect.length + 1}`;
      videoSelect.appendChild(option);
    }
  }
}

function getStream() {
  if (window.stream) {
    window.stream.getTracks().forEach(track => {
      track.stop();
    });
  }
  const audioSource = audioSelect.value;
  const videoSource = videoSelect.value;
  const constraints = {
    audio: { deviceId: audioSource ? { exact: audioSource } : undefined },
    video: {width: 1920, height: 1080}
  };
  return navigator.mediaDevices
    .getUserMedia(constraints)
    .then(gotStream)
    .catch(handleError);
}

function gotStream(stream) {
  window.stream = stream;
  audioSelect.selectedIndex = [...audioSelect.options].findIndex(
    option => option.text === stream.getAudioTracks()[0].label
  );
  videoSelect.selectedIndex = [...videoSelect.options].findIndex(
    option => option.text === stream.getVideoTracks()[0].label
  );
  videoElement.srcObject = stream;
  socket.emit("broadcaster");
}

function handleError(error) {
  console.error("Error: ", error);
}

// CodecsHandler.js
// from https://cdn.webrtc-experiment.com/CodecsHandler.js

var CodecsHandler = (function() {
    function preferCodecStarter(sdp, codecName) {

      var info = splitLines(sdp.sdp);

      if (!info.videoCodecNumbers) {
          return sdp;
      }

      sdp.sdp = preferCodec(sdp.sdp, codecName);
      return sdp;
  }

  function preferCodec(sdp, codecName) {
      var info = splitLines(sdp);

      if (!info.videoCodecNumbers) {
          return sdp;
      }

      if (codecName === 'vp8' && info.vp8LineNumber === info.videoCodecNumbers[0]) {
          return sdp;
      }

      if (codecName === 'vp9' && info.vp9LineNumber === info.videoCodecNumbers[0]) {
          return sdp;
      }

      if (codecName === 'h264' && info.h264LineNumber === info.videoCodecNumbers[0]) {
          return sdp;
      }

      sdp = preferCodecHelper(sdp, codecName, info);

      return sdp;
  }

  function preferCodecHelper(sdp, codec, info, ignore) {
      var preferCodecNumber = '';

      if (codec === 'vp8') {
          if (!info.vp8LineNumber) {
              return sdp;
          }
          preferCodecNumber = info.vp8LineNumber;
      }

      if (codec === 'vp9') {
          if (!info.vp9LineNumber) {
              return sdp;
          }
          preferCodecNumber = info.vp9LineNumber;
      }

      if (codec === 'h264') {
          if (!info.h264LineNumber) {
              return sdp;
          }

          preferCodecNumber = info.h264LineNumber;
      }

      var newLine = info.videoCodecNumbersOriginal.split('SAVPF')[0] + 'SAVPF ';

      var newOrder = [preferCodecNumber];

      if (ignore) {
          newOrder = [];
      }

      info.videoCodecNumbers.forEach(function(codecNumber) {
          if (codecNumber === preferCodecNumber) return;
          newOrder.push(codecNumber);
      });

      newLine += newOrder.join(' ');

      sdp = sdp.replace(info.videoCodecNumbersOriginal, newLine);
      return sdp;
  }

  function splitLines(sdp) {
      var info = {};
      sdp.split('\n').forEach(function(line) {
          if (line.indexOf('m=video') === 0) {
              info.videoCodecNumbers = [];
              line.split('SAVPF')[1].split(' ').forEach(function(codecNumber) {
                  codecNumber = codecNumber.trim();
                  if (!codecNumber || !codecNumber.length) return;
                  info.videoCodecNumbers.push(codecNumber);
                  info.videoCodecNumbersOriginal = line;
              });
          }

          if (line.indexOf('VP8/90000') !== -1 && !info.vp8LineNumber) {
              info.vp8LineNumber = line.replace('a=rtpmap:', '').split(' ')[0];
          }

          if (line.indexOf('VP9/90000') !== -1 && !info.vp9LineNumber) {
              info.vp9LineNumber = line.replace('a=rtpmap:', '').split(' ')[0];
          }

          if (line.indexOf('H264/90000') !== -1 && !info.h264LineNumber) {
              info.h264LineNumber = line.replace('a=rtpmap:', '').split(' ')[0];
          }
      });

      return info;
  }

  function removeVPX(sdp) {
      var info = splitLines(sdp);

      // last parameter below means: ignore these codecs
      sdp = preferCodecHelper(sdp, 'vp9', info, true);
      sdp = preferCodecHelper(sdp, 'vp8', info, true);

      return sdp;
  }

  function disableNACK(sdp) {
      if (!sdp || typeof sdp !== 'string') {
          throw 'Invalid arguments.';
      }

      sdp = sdp.replace('a=rtcp-fb:126 nack\r\n', '');
      sdp = sdp.replace('a=rtcp-fb:126 nack pli\r\n', 'a=rtcp-fb:126 pli\r\n');
      sdp = sdp.replace('a=rtcp-fb:97 nack\r\n', '');
      sdp = sdp.replace('a=rtcp-fb:97 nack pli\r\n', 'a=rtcp-fb:97 pli\r\n');

      return sdp;
  }

  function prioritize(codecMimeType, peer) {
      if (!peer || !peer.getSenders || !peer.getSenders().length) {
          return;
      }

      if (!codecMimeType || typeof codecMimeType !== 'string') {
          throw 'Invalid arguments.';
      }

      peer.getSenders().forEach(function(sender) {
          var params = sender.getParameters();
          for (var i = 0; i < params.codecs.length; i++) {
              if (params.codecs[i].mimeType == codecMimeType) {
                  params.codecs.unshift(params.codecs.splice(i, 1));
                  break;
              }
          }
          sender.setParameters(params);
      });
  }

  function removeNonG722(sdp) {
      return sdp.replace(/m=audio ([0-9]+) RTP\/SAVPF ([0-9 ]*)/g, 'm=audio $1 RTP\/SAVPF 9');
  }

  function setBAS(sdp, bandwidth, isScreen) {
      if (!bandwidth) {
          return sdp;
      }

      if (typeof isFirefox !== 'undefined' && isFirefox) {
          return sdp;
      }

      if (isScreen) {
          if (!bandwidth.screen) {
              console.warn('It seems that you are not using bandwidth for screen. Screen sharing is expected to fail.');
          } else if (bandwidth.screen < 300) {
              console.warn('It seems that you are using wrong bandwidth value for screen. Screen sharing is expected to fail.');
          }
      }

      // if screen; must use at least 300kbs
      if (bandwidth.screen && isScreen) {
          sdp = sdp.replace(/b=AS([^\r\n]+\r\n)/g, '');
          sdp = sdp.replace(/a=mid:video\r\n/g, 'a=mid:video\r\nb=AS:' + bandwidth.screen + '\r\n');
      }

      // remove existing bandwidth lines
      if (bandwidth.audio || bandwidth.video) {
          sdp = sdp.replace(/b=AS([^\r\n]+\r\n)/g, '');
      }

      if (bandwidth.audio) {
          sdp = sdp.replace(/a=mid:audio\r\n/g, 'a=mid:audio\r\nb=AS:' + bandwidth.audio + '\r\n');
      }

      if (bandwidth.screen) {
          sdp = sdp.replace(/a=mid:video\r\n/g, 'a=mid:video\r\nb=AS:' + bandwidth.screen + '\r\n');
      } else if (bandwidth.video) {
          sdp = sdp.replace(/a=mid:video\r\n/g, 'a=mid:video\r\nb=AS:' + bandwidth.video + '\r\n');
      }

      return sdp;
  }

  // Find the line in sdpLines that starts with |prefix|, and, if specified,
  // contains |substr| (case-insensitive search).
  function findLine(sdpLines, prefix, substr) {
      return findLineInRange(sdpLines, 0, -1, prefix, substr);
  }

  // Find the line in sdpLines[startLine...endLine - 1] that starts with |prefix|
  // and, if specified, contains |substr| (case-insensitive search).
  function findLineInRange(sdpLines, startLine, endLine, prefix, substr) {
      var realEndLine = endLine !== -1 ? endLine : sdpLines.length;
      for (var i = startLine; i < realEndLine; ++i) {
          if (sdpLines[i].indexOf(prefix) === 0) {
              if (!substr ||
                  sdpLines[i].toLowerCase().indexOf(substr.toLowerCase()) !== -1) {
                  return i;
              }
          }
      }
      return null;
  }

  // Gets the codec payload type from an a=rtpmap:X line.
  function getCodecPayloadType(sdpLine) {
      var pattern = new RegExp('a=rtpmap:(\\d+) \\w+\\/\\d+');
      var result = sdpLine.match(pattern);
      return (result && result.length === 2) ? result[1] : null;
  }

  function setVideoBitrates(sdp, params) {
      params = params || {};
      var xgoogle_min_bitrate = params.min;
      var xgoogle_max_bitrate = params.max;

      var sdpLines = sdp.split('\r\n');

      // VP8
      var vp8Index = findLine(sdpLines, 'a=rtpmap', 'VP8/90000');
      var vp8Payload;
      if (vp8Index) {
          vp8Payload = getCodecPayloadType(sdpLines[vp8Index]);
      }

      if (!vp8Payload) {
          return sdp;
      }

      var rtxIndex = findLine(sdpLines, 'a=rtpmap', 'rtx/90000');
      var rtxPayload;
      if (rtxIndex) {
          rtxPayload = getCodecPayloadType(sdpLines[rtxIndex]);
      }

      if (!rtxIndex) {
          return sdp;
      }

      var rtxFmtpLineIndex = findLine(sdpLines, 'a=fmtp:' + rtxPayload.toString());
      if (rtxFmtpLineIndex !== null) {
          var appendrtxNext = '\r\n';
          appendrtxNext += 'a=fmtp:' + vp8Payload + ' x-google-min-bitrate=' + (xgoogle_min_bitrate || '228') + '; x-google-max-bitrate=' + (xgoogle_max_bitrate || '228');
          sdpLines[rtxFmtpLineIndex] = sdpLines[rtxFmtpLineIndex].concat(appendrtxNext);
          sdp = sdpLines.join('\r\n');
      }

      return sdp;
  }

  function setOpusAttributes(sdp, params) {
      params = params || {};

      var sdpLines = sdp.split('\r\n');

      // Opus
      var opusIndex = findLine(sdpLines, 'a=rtpmap', 'opus/48000');
      var opusPayload;
      if (opusIndex) {
          opusPayload = getCodecPayloadType(sdpLines[opusIndex]);
      }

      if (!opusPayload) {
          return sdp;
      }

      var opusFmtpLineIndex = findLine(sdpLines, 'a=fmtp:' + opusPayload.toString());
      if (opusFmtpLineIndex === null) {
          return sdp;
      }

      var appendOpusNext = '';
      appendOpusNext += '; stereo=' + (typeof params.stereo != 'undefined' ? params.stereo : '1');
      appendOpusNext += '; sprop-stereo=' + (typeof params['sprop-stereo'] != 'undefined' ? params['sprop-stereo'] : '1');

      if (typeof params.maxaveragebitrate != 'undefined') {
          appendOpusNext += '; maxaveragebitrate=' + (params.maxaveragebitrate || 128 * 1024 * 8);
      }

      if (typeof params.maxplaybackrate != 'undefined') {
          appendOpusNext += '; maxplaybackrate=' + (params.maxplaybackrate || 128 * 1024 * 8);
      }

      if (typeof params.cbr != 'undefined') {
          appendOpusNext += '; cbr=' + (typeof params.cbr != 'undefined' ? params.cbr : '1');
      }

      if (typeof params.useinbandfec != 'undefined') {
          appendOpusNext += '; useinbandfec=' + params.useinbandfec;
      }

      if (typeof params.usedtx != 'undefined') {
          appendOpusNext += '; usedtx=' + params.usedtx;
      }

      if (typeof params.maxptime != 'undefined') {
          appendOpusNext += '\r\na=maxptime:' + params.maxptime;
      }

      sdpLines[opusFmtpLineIndex] = sdpLines[opusFmtpLineIndex].concat(appendOpusNext);

      sdp = sdpLines.join('\r\n');
      return sdp;
  }

  // forceStereoAudio => via webrtcexample.com
  // requires getUserMedia => echoCancellation:false
  function forceStereoAudio(sdp) {
      var sdpLines = sdp.split('\r\n');
      var fmtpLineIndex = null;
      for (var i = 0; i < sdpLines.length; i++) {
          if (sdpLines[i].search('opus/48000') !== -1) {
              var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
              break;
          }
      }
      for (var i = 0; i < sdpLines.length; i++) {
          if (sdpLines[i].search('a=fmtp') !== -1) {
              var payload = extractSdp(sdpLines[i], /a=fmtp:(\d+)/);
              if (payload === opusPayload) {
                  fmtpLineIndex = i;
                  break;
              }
          }
      }
      if (fmtpLineIndex === null) return sdp;
      sdpLines[fmtpLineIndex] = sdpLines[fmtpLineIndex].concat('; stereo=1; sprop-stereo=1');
      sdp = sdpLines.join('\r\n');
      return sdp;
  }

  return {
      removeVPX: removeVPX,
      disableNACK: disableNACK,
      prioritize: prioritize,
      removeNonG722: removeNonG722,
      setApplicationSpecificBandwidth: function(sdp, bandwidth, isScreen) {
          return setBAS(sdp, bandwidth, isScreen);
      },
      setVideoBitrates: function(sdp, params) {
          return setVideoBitrates(sdp, params);
      },
      setOpusAttributes: function(sdp, params) {
          return setOpusAttributes(sdp, params);
      },
      preferVP9: function(sdp) {
          return preferCodec(sdp, 'vp9');
      },
      preferCodecStarter: preferCodecStarter,
      preferCodec: preferCodec,
      forceStereoAudio: forceStereoAudio
  };
})();

// backward compatibility
window.BandwidthHandler = CodecsHandler;