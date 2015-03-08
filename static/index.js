function makeYoutubeUrl(id) {
	return "https://www.youtube.com/watch?v=" + id;
}

function getYoutubeArgs(id) {
  return $.ajax({
    url: "/args/" + id + "/",
    method: "GET"
  });
}

function getDownloadUrl(videoID, videoFormats, videoAdaptFormats, videoManifestURL, scriptUrl) {
  var FORMAT_LABEL = {'5':'FLV 240p','18':'MP4 360p','22':'MP4 720p','34':'FLV 360p','35':'FLV 480p','37':'MP4 1080p','38':'MP4 2160p','43':'WebM 360p','44':'WebM 480p','45':'WebM 720p','46':'WebM 1080p','135':'MP4 480p - no audio','137':'MP4 1080p - no audio','138':'MP4 2160p - no audio','139':'M4A 48kbps - audio','140':'M4A 128kbps - audio','141':'M4A 256kbps - audio','264':'MP4 1440p - no audio'};
  var FORMAT_TYPE = {'5':'flv','18':'mp4','22':'mp4','34':'flv','35':'flv','37':'mp4','38':'mp4','43':'webm','44':'webm','45':'webm','46':'webm','135':'mp4','137':'mp4','138':'mp4','139':'m4a','140':'m4a','141':'m4a','264':'mp4'};
  var FORMAT_ORDER = ['5','18','34','43','35','135','44','22','45','37','46','264','38','139','140','141'];
  var FORMAT_RULE = {'flv':'max','mp4':'all','webm':'none','m4a':'max'};

  // all=display all versions, max=only highest quality version, none=no version
  // the default settings show all MP4 videos, the highest quality FLV and no WebM
  var SHOW_DASH_FORMATS = false;

  var DECODE_RULE = [];
  var RANDOM = 7489235179; // Math.floor(Math.random()*1234567890);
  var CONTAINER_ID = 'download-youtube-video'+RANDOM;
  var LISTITEM_ID = 'download-youtube-video-fmt'+RANDOM;
  var BUTTON_ID='download-youtube-video-button'+RANDOM;
  var DEBUG_ID='download-youtube-video-debug-info';
  var STORAGE_URL='download-youtube-script-url';
  var STORAGE_CODE='download-youtube-signature-code';
  var STORAGE_DASH='download-youtube-dash-enabled';
  var isDecodeRuleUpdated=false;

  var isSignatureUpdatingStarted = false;

  // Everything fails :(
  if (videoID == null || videoFormats == null || videoID.length == 0 || videoFormats.length == 0) {
   console.log('Error: Args not supplied. YouTube must have changed the code.');
   return;
  }

  if (scriptUrl) {
    if (scriptUrl.indexOf('//') == 0) {
      var protocol = (document.location.protocol=='http:')?'http:':'https:';
      scriptUrl = protocol + scriptUrl;
    }
    var result;
    fetchSignatureScript(scriptUrl).load(function(response) {
      if (response.readyState === 4 && response.status === 200 && response.responseText) {
        result = findSignatureCode(response.responseText);
      }
    });
  }

  // Fetch video title
  var videoTitle = document.title || 'video';
  videoTitle = videoTitle.replace(/\s*\-\s*YouTube$/i, '').replace(/[#"\?:\*]/g, '')
                         .replace(/[&\|\\\/]/g, '_')
                         .replace(/'/g,'\'').replace(/^\s+|\s+$/g,'')
                         .replace(/\.+$/g,'');

  // Parse the formats map
  var sep1 = '%2C', sep2 = '%26', sep3 = '%3D';
  if (videoFormats.indexOf(',')>-1) {
    sep1 = ',';
    sep2 = (videoFormats.indexOf('&')>-1)?'&':'\\u0026';
    sep3 = '=';
  }

  var videoURL = new Array();
  var videoSignature = new Array();
  if (videoAdaptFormats) {
    videoFormats = videoFormats + sep1 + videoAdaptFormats;
  }

  var videoFormatsGroup = videoFormats.split(sep1);
  for (var i=0; i<videoFormatsGroup.length; i++) {
    var videoFormatsElem = videoFormatsGroup[i].split(sep2);
    var videoFormatsPair = new Array();
    for (var j=0; j<videoFormatsElem.length; j++) {
      var pair = videoFormatsElem[j].split(sep3);
      if (pair.length == 2) {
        videoFormatsPair[pair[0]] = pair[1];
      }
    }

    if (videoFormatsPair['url'] == null) {
    	continue;
    }

    var url = unescape(unescape(videoFormatsPair['url'])).replace(/\\\//g,'/')
                                                         .replace(/\\u0026/g,'&');
    if (videoFormatsPair['itag'] == null) {
    	continue;
    }

    var itag = videoFormatsPair['itag'];
    var sig = videoFormatsPair['sig'] || videoFormatsPair['signature'];

    if (sig) {
      url = url + '&signature=' + sig;
      videoSignature[itag] = null;
    } else if (videoFormatsPair['s']) {
      url = url + '&signature=' + decryptSignature(videoFormatsPair['s']);
      videoSignature[itag] = videoFormatsPair['s'];
    }
    if (url.toLowerCase().indexOf('ratebypass') == -1) { // speed up download for dash
      url = url + '&ratebypass=yes';
    }
    if (url.toLowerCase().indexOf('http') == 0) { // validate URL
      videoURL[itag] = url + '&title=' + videoTitle;
    }
  }

  var showFormat = new Array();
  for (var category in FORMAT_RULE) {
    var rule = FORMAT_RULE[category];
    for (var index in FORMAT_TYPE){
      if (FORMAT_TYPE[index] == category) {
        showFormat[index] = (rule=='all');
      }
    }
    if (rule=='max') {
      for (var i=FORMAT_ORDER.length-1; i>=0; i--) {
        var format = FORMAT_ORDER[i];
        if (FORMAT_TYPE[format] == category && videoURL[format] != undefined) {
          showFormat[format] = true;
          break;
        }
      }
    }
  }

  var downloadCodeList=[];
  for (var i=0; i<FORMAT_ORDER.length; i++) {
    var format = FORMAT_ORDER[i];
    if (format == '37' && videoURL[format] == undefined) { // hack for dash 1080p
      if (videoURL['137']) {
       format = '137';
      }
      showFormat[format] = showFormat['37'];
    } else if (format == '38' && videoURL[format] == undefined) { // hack for dash 4K
      if (videoURL['138']) {
       format = '138';
      }
      showFormat[format] = showFormat['38'];
    }
    if (!SHOW_DASH_FORMATS && format.length>2) continue;
    if (videoURL[format] != undefined && FORMAT_LABEL[format] != undefined && showFormat[format]) {
      downloadCodeList.push({
      	url: videoURL[format],
      	sig: videoSignature[format],
      	format: format,
      	label: FORMAT_LABEL[format]
      });
      console.log('Info: itag' + format + ' url:' + videoURL[format]);
    }
  }

  if (downloadCodeList.length==0) {
    console.log('No download URL found. Probably YouTube uses encrypted streams.');
    return; // no format
  }

  console.log(downloadCodeList);
}

function fetchSignatureScript(scriptURL) {
  // var storageURL = STORAGE_URL;
  // var storageCode = STORAGE_CODE;

  // if (!(/,0,|^0,|,0$|\-/.test(storageCode))) {
  //   storageCode = null; // Hack for only positive items
  // }

  // if (storageCode && isValidSignatureCode(storageCode) && storageURL &&
  //     scriptURL.replace(/^https?/i,'') == storageURL.replace(/^https?/i,'')) {
  //   return;
  // }

  isSignatureUpdatingStarted = true;
  return $.ajax({
    method: 'GET',
    url: scriptURL
  });
}

function findSignatureCode(sourceCode) {
    var signatureFunctionName = findMatch(sourceCode,
        /\.set\s*\("signature"\s*,\s*([a-zA-Z0-9_$][\w$]*)\(/)
        || findMatch(sourceCode,
        /\.sig\s*\|\|\s*([a-zA-Z0-9_$][\w$]*)\(/)
        || findMatch(sourceCode,
        /\.signature\s*=\s*([a-zA-Z_$][\w$]*)\([a-zA-Z_$][\w$]*\)/); //old

    if (signatureFunctionName == null) {
      console.log("Error: Signature error");
      return;
    }

    signatureFunctionName = signatureFunctionName.replace('$','\\$');

    var regCode = new RegExp('function \\s*' + signatureFunctionName +
        '\\s*\\([\\w$]*\\)\\s*{[\\w$]*=[\\w$]*\\.split\\(""\\);(.+);return [\\w$]*\\.join');

    var functionCode = findMatch(sourceCode, regCode);
    console.log('Got signaturefunction ' + signatureFunctionName);

    if (functionCode == null) {
      console.log("Error: Signature error");
      return;
    }

    var reverseFunctionName = findMatch(sourceCode,
    /([\w$]*)\s*:\s*function\s*\(\s*[\w$]*\s*\)\s*{\s*(?:return\s*)?[\w$]*\.reverse\s*\(\s*\)\s*}/);
    console.log('Info: reversefunction ' + reverseFunctionName);

    if (reverseFunctionName) {
    	reverseFunctionName = reverseFunctionName.replace('$','\\$');
    }

    var sliceFunctionName = findMatch(sourceCode,
    /([\w$]*)\s*:\s*function\s*\(\s*[\w$]*\s*,\s*[\w$]*\s*\)\s*{\s*(?:return\s*)?[\w$]*\.(?:slice|splice)\(.+\)\s*}/);
    console.log('DYVAM - Info: slicefunction ' + sliceFunctionName);

    if (sliceFunctionName) {
    	sliceFunctionName = sliceFunctionName.replace('$','\\$');
    }

    var regSlice = new RegExp('\\.(?:'+'slice'+(sliceFunctionName?'|'+sliceFunctionName:'') +
    	')\\s*\\(\\s*(?:[a-zA-Z_$][\\w$]*\\s*,)?\\s*([0-9]+)\\s*\\)'); // .slice(5) sau .Hf(a,5)

    var regReverse = new RegExp('\\.(?:'+'reverse'+(reverseFunctionName?'|'+reverseFunctionName:'')+
	    ')\\s*\\([^\\)]*\\)');  // .reverse() sau .Gf(a,45)

    var regSwap = new RegExp('[\\w$]+\\s*\\(\\s*[\\w$]+\\s*,\\s*([0-9]+)\\s*\\)');
    var regInline = new RegExp('[\\w$]+\\[0\\]\\s*=\\s*[\\w$]+\\[([0-9]+)\\s*%\\s*[\\w$]+\\.length\\]');

    var functionCodePieces = functionCode.split(';');

    var decodeArray=[];
    for (var i=0; i<functionCodePieces.length; i++) {
      functionCodePieces[i] = functionCodePieces[i].trim();
      var codeLine = functionCodePieces[i];
      if (codeLine.length>0) {
        var arrSlice = codeLine.match(regSlice);
        var arrReverse = codeLine.match(regReverse);
        console.log(i+': '+codeLine+' --'+(arrSlice?' slice length '+arrSlice.length:'') +' '+(arrReverse?'reverse':''));

        if (arrSlice && arrSlice.length >= 2) { // slice
          var slice = parseInt(arrSlice[1], 10);
          if (isInteger(slice)){
            decodeArray.push(-slice);
        } else {
          console.log("Signature error")
          return;
        }
      } else if (arrReverse && arrReverse.length >= 1) { // reverse
        decodeArray.push(0);
      } else if (codeLine.indexOf('[0]') >= 0) { // inline swap
          if (i+2<functionCodePieces.length &&
          	  functionCodePieces[i+1].indexOf('.length') >= 0 &&
          	  functionCodePieces[i+1].indexOf('[0]') >= 0) {
            var inline = findMatch(functionCodePieces[i+1], regInline);
            inline = parseInt(inline, 10);
            decodeArray.push(inline);
            i += 2;
          } else {
            console.log("Signature error")
            return;
          }
      } else if (codeLine.indexOf(',') >= 0) { // swap
          var swap = findMatch(codeLine, regSwap);
          swap = parseInt(swap, 10);
          if (isInteger(swap) && swap>0){
            decodeArray.push(swap);
          } else {
              console.log("Signature error")
              return;
          }
      } else {
          console.log("Signature error")
          return;
        }
      }
    }

    result = {};
    if (decodeArray) {
      result = {STORAGE_URL: scriptURL, STORAGE_CODE: decodeArray.toString()};
      DECODE_RULE = decodeArray;
      console.log('Info: signature '+decodeArray.toString()+' '+scriptURL);
      // update download links and add file sizes
      for (var i=0; i<downloadCodeList.length; i++) {
        var url = downloadCodeList[i].url;
        var sig = downloadCodeList[i].sig;
        if (url && sig) {
          url = url.replace(/\&signature=[\w\.]+/, '&signature=' + decryptSignature(sig));
          console.log("--------> url is " + url);
        }
      }
    }

    return result;
}

function isValidSignatureCode(arr) { // valid values: '5,-3,0,2,5', 'error'
  if (!arr) {
  	return false;
  }
  if (arr=='error') {
  	return true;
  }

  arr = arr.split(',');
  for (var i=0; i<arr.length; i++) {
	if (!isInteger(parseInt(arr[i],10))) {
		return false;
	}
  }
  return true;
}

function decryptSignature(sig) {
  // ---helper functions start---
  function swap(a,b) {
  	var c = a[0]; a[0] = a[b%a.length]; a[b] = c; return a;
  };
  function decode(sig, arr) { // Encoded decryption function
	if (!isString(sig)) return null;
	var sigA = sig.split('');
	for (var i=0; i<arr.length; i++) {
	  var act = arr[i];
	  if (!isInteger(act)) return null;
	  if (act > 0) {
	  	sigA = swap(sigA, act);
	  } else if (act == 0) {
	  	sigA = sigA.reverse();
	  } else {
	  	sigA = sigA.slice(-act);
	  }
	}
	var result = sigA.join('');
	return result;
  }
  // --- helper functions end---

  if (sig == null) {
  	return '';
  }

  var arr = DECODE_RULE;
  if (arr) {
    var sig2 = decode(sig, arr);
    if (sig2) {
    	return sig2;
    }
    return sig;
  }
}

function findMatch(text, regexp) {
  var matches = text.match(regexp);
  return (matches)?matches[1]:null;
}

$(document).ready(function() {
  argRequest = getYoutubeArgs("E3Alu8nZuvk");

  argRequest.done(function(data) {
    args = JSON.parse(data);
    getDownloadUrl(args.VideoID, args.VideoFormats, args.VideoAdaptFormats,
                   args.VideoManifestURL, args.ScriptURL);
  });
});
