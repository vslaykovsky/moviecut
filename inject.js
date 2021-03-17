chrome.runtime.sendMessage({}, function(response) {
  var tc = {
    settings: {
      speed: 1.0,           // default 1x
      resetSpeed: 1.0,      // default 1x
      speedStep: 0.1,       // default 0.1x
      fastSpeed: 1.8,       // default 1.8x
      rewindTime: 10,       // default 10s
      advanceTime: 10,      // default 10s
      resetKeyCode:  82,    // default: R
      slowerKeyCode: 83,    // default: S
      fasterKeyCode: 68,    // default: D
      rewindKeyCode: 90,    // default: Z
      advanceKeyCode: 67,   // default: C
      displayKeyCode: 86,   // default: V
      fastKeyCode: 71,      // default: G
      cutKeyCode: 88,       // default: X 
      rememberSpeed: false, // default: false
      startHidden: false,   // default: false
      blacklist: `
        www.instagram.com
        twitter.com
        vine.co
        imgur.com
      `.replace(/^\s+|\s+$/gm,''),
      videoCutServer: 'https://moviecut.online',
      userId: '',
    }
  };
  Storage.prototype.setObject = function(key, value) {
      this.setItem(key, JSON.stringify(value));
  }

  Storage.prototype.getObject = function(key) {
      var value = this.getItem(key);
      return value && JSON.parse(value);
  }
  chrome.storage.sync.get(tc.settings, function(storage) {
    tc.settings.speed = Number(storage.speed);
    tc.settings.resetSpeed = Number(storage.resetSpeed);
    tc.settings.speedStep = Number(storage.speedStep);
    tc.settings.fastSpeed = Number(storage.fastSpeed);
    tc.settings.rewindTime = Number(storage.rewindTime);
    tc.settings.advanceTime = Number(storage.advanceTime);
    tc.settings.resetKeyCode = Number(storage.resetKeyCode);
    tc.settings.rewindKeyCode = Number(storage.rewindKeyCode);
    tc.settings.slowerKeyCode = Number(storage.slowerKeyCode);
    tc.settings.fasterKeyCode = Number(storage.fasterKeyCode);
    tc.settings.fastKeyCode = Number(storage.fastKeyCode);
    tc.settings.cutKeyCode = Number(storage.cutKeyCode);
    tc.settings.displayKeyCode = Number(storage.displayKeyCode);
    tc.settings.advanceKeyCode = Number(storage.advanceKeyCode);
    tc.settings.rememberSpeed = Boolean(storage.rememberSpeed);
    tc.settings.startHidden = Boolean(storage.startHidden);
    tc.settings.blacklist = String(storage.blacklist);
    tc.settings.userId = String(storage.userId);
    if (tc.settings.userId === '') {
      tc.settings.userId = Math.random().toString(36).substring(2);
      chrome.storage.sync.set({'userId': tc.settings.userId}, function() {
        console.log('Generated userId: ' + tc.settings.userId);
      });
    }
    console.log('updated settings', tc.settings);
    initializeWhenReady(document);
  });
  var forEach = Array.prototype.forEach;

  function defineVideoController() {
    tc.videoController = function(target, parent) {
      if (target.dataset['vccid']) {
        return;
      }

      this.video = target;
      this.video.controller = this;
      this.parent = target.parentElement || parent;
      this.document = target.ownerDocument;
      this.id = Math.random().toString(36).substr(2, 9);
      this.currentCut = null;
      this.cuts = [];
      if (!tc.settings.rememberSpeed) {
        tc.settings.speed = 1.0;
        tc.settings.resetSpeed = tc.settings.fastSpeed;
      }
      this.initializeControls();

      target.addEventListener('play', function(event) {
        target.playbackRate = tc.settings.speed;
      });
      
      this.syncSpeedTriggered = false;
      target.addEventListener('ratechange', function(event) {
        // Ignore ratechange events on unitialized videos.
        // 0 == No information is available about the media resource.
        if (event.target.readyState > 0) {
          var speed = this.getSpeed();
          this.speedIndicator.textContent = speed;
          tc.settings.speed = speed;
          if (!this.syncSpeedTriggered) {
            this.syncSpeedTriggered = true;
            setTimeout(function() {
              var speed = this.getSpeed();
              chrome.storage.sync.set({'speed': speed}, function() {
                console.log('Speed setting saved: ' + speed);
              });
              this.syncSpeedTriggered = false;
            }.bind(this), 5000);
          }
        }
      }.bind(this));

      target.addEventListener('timeupdate', function(event) {
        if (!this.video.duration) {
          return;
        }
        this.progress.value = this.video.currentTime / this.video.duration;
        if (this.currentCut != null) {
          var startCut = this.currentCut['startCut'];
          var cutBar = this.currentCut['cutBar'];
          var currentTime = this.video.currentTime;
          var left = Math.min(startCut, currentTime);
          var right = Math.max(startCut, currentTime);
          this.currentCut['left'] = left;
          this.currentCut['right'] = right;
          var scale = this.progress.offsetWidth / this.video.duration;
          cutBar.style.left = Math.round(this.progress.offsetLeft + left * scale) + 'px';
          cutBar.style.width = Math.round((right - left) * scale) + 'px';
          cutBar.title = chrome.i18n.getMessage("deleted") + " " + Math.round(right - left) + " " + chrome.i18n.getMessage("seconds");
        } else {
          var time = this.video.currentTime;
          for (var i = 0; i < this.cuts.length; ++i) {
            if (this.cuts[i]['left'] <= time && this.cuts[i]['right'] > time) {
              this.setCurrentTime(this.cuts[i]['right']);
              break;
            }
          }
        }
      }.bind(this));

      target.addEventListener('pause', function(event) {
        this.playButton.innerText = 'play_arrow'; 
      }.bind(this));

      target.addEventListener('play', function(event) {
        this.playButton.innerHTML= 'pause';
      }.bind(this));

      target.playbackRate = tc.settings.speed;
    };

    tc.videoController.prototype.getSpeed = function() {
      return parseFloat(this.video.playbackRate).toFixed(2);
    }

    tc.videoController.prototype.remove = function() {
      this.parentElement.removeChild(this);
    }

    tc.videoController.prototype.cut = function(at) {
      if (at == null) {
        at = this.video.currentTime;
      }
      var scale = this.progress.offsetWidth / this.video.duration;
      if (this.currentCut === null) {
        // new cut
        var startCut = at;
        this.cutButton.classList.add('triggered');
        var cutBar = this.document.createElement('div');
        cutBar.classList.add('progress-overlay');
        cutBar.style.left = Math.round(this.progress.offsetLeft + startCut * scale) + 'px';
        cutBar.style.width = '0px';
        cutBar.style.height = (this.progress.offsetHeight + 6) + 'px';
        cutBar.style.top = (this.progress.offsetTop - 3) + 'px';
        this.progressOverlay.appendChild(cutBar);
        
        var currentCut = {'startCut': startCut, 'cutBar': cutBar};

        var deleteCutBar = this.document.createElement('span');
        deleteCutBar.innerText = 'clear';
        deleteCutBar.classList.add('material-icons');
        deleteCutBar.classList.add('delete-overlay');
        deleteCutBar.style.left = '0px';
        deleteCutBar.style.top = '-' + (cutBar.offsetHeight - 13) + 'px';
        deleteCutBar.title = chrome.i18n.getMessage("removeSegment");
        deleteCutBar.addEventListener('mousedown', function(e) {
          this.progressOverlay.removeChild(cutBar);
          this.cuts.splice(this.cuts.indexOf(currentCut), 1);
        }.bind(this));
        cutBar.appendChild(deleteCutBar);

        this.currentCut = currentCut;
        this.cuts.push(currentCut);
        console.log('Starting cut at', startCut);
      } else {
        // finish cut
        var startCut = this.currentCut['startCut'];
        var cutBar = this.currentCut['cutBar'];
        var currentTime = at; 
        var left = Math.min(startCut, currentTime);
        var right = Math.max(startCut, currentTime);

        this.currentCut['left'] = left;
        this.currentCut['right'] = right;
        cutBar.style.left = Math.round(this.progress.offsetLeft + left * scale) + 'px';
        cutBar.style.width = Math.round((right - left) * scale) + 'px';
 
        this.cutButton.classList.remove('triggered');
        delete this.currentCut['startCut'];
        if (left === right) {
          this.progressOverlay.removeChild(cutBar);
          this.cuts.splice(this.cuts.indexOf(this.currentCut), 1);
        }
        this.currentCut = null;
        console.log('Finished cut: ', left, right);
      }
    }

    tc.videoController.prototype.loadCuts = function(cut_id) {
      if (!this.serverCuts[cut_id]) {
        return;
      }
      if (this.select.value != cut_id) {
        this.select.value = cut_id;
      }
      this.currentCutId = cut_id;
      var data = this.serverCuts[cut_id];
      this.progressOverlay.innerHTML = '';
      this.cuts = [];
      for (var i = 0; i < data.length; ++i) {
        this.cut(data[i][0]);
        this.cut(data[i][1]);
      }
      console.log('Loaded cuts for id ', cut_id, this.serverCuts[cut_id]);
    }

    tc.videoController.prototype.shareCut = function(data) {
      var title = get_title(this.document); 
      var name = prompt(chrome.i18n.getMessage('saveAs'), chrome.i18n.getMessage('myVideoCut') + ' "' + title + '"');
      if (name == null) {
        return;
      } else if (name.trim() === '') {
        alert('Cannot save cut with an empty name');
        return;
      }
      var cuts = [];
      for (var i = 0; i < this.cuts.length; ++i) {
        cuts.push([this.cuts[i]['left'], this.cuts[i]['right']]);
      }
      var data = {
        'videocut': {
          'name' : name,
          'page_url' : get_page_url(),
          'iframe_url' : get_iframe_url(),
          'video_url' : this.video.currentSrc,
          'duration_ms' : Math.round(this.video.duration * 1000),
          'cuts' : JSON.stringify(cuts),
          'user_id' : tc.settings.userId,
        }
      }
      console.log('Sharing cut: ', data);
      $.post(tc.settings.videoCutServer + '/videocuts.json', data, function(response) {
        window.open(tc.settings.videoCutServer + '/videocuts/' + response['id']);
      }, 'json');
    }


    tc.videoController.prototype.setCurrentTime = function(time) {
      var hostname = this.document.location.hostname;
      if (hostname === 'www.netflix.com') {
        window.postMessage({currentTime: Math.round(time * 1000)}, 'https://www.netflix.com');
      } else {
        this.video.currentTime = time;
      }
    }

    tc.videoController.prototype.initializeControls = function() {
      var document = this.document;
      var speed = parseFloat(tc.settings.speed).toFixed(2);
      var top = Math.max(this.video.offsetTop, 0) + "px";
      var left = Math.max(this.video.offsetLeft, 0) + "px";
      var width = (Math.max(this.video.offsetWidth - 40, 100)) + "px";

      var prevent = function(e) {
       // e.preventDefault(); TODO delete?
        e.stopPropagation();
      }

      var wrapper = document.createElement('div');
      wrapper.classList.add('vcc-controller');
      wrapper.dataset['vccid'] = this.id;
      wrapper.addEventListener('dblclick', prevent, true);
      wrapper.addEventListener('mousedown', prevent, true);
      wrapper.addEventListener('click', prevent, true);
      if (tc.settings.startHidden) {
        wrapper.classList.add('vcc-hidden');
      }

      var shadow = wrapper.createShadowRoot();
      var shadowTemplate = `
        <style>
          @import "${chrome.runtime.getURL('shadow.css')}";
        </style>

        <div id="controller" style="top:${top}; left:${left};">
          <div>
            <button class='draggable cut-button'  title="${chrome.i18n.getMessage("cut")}"><img data-action="cut" src="chrome-extension://${chrome.i18n.getMessage("@@extension_id")}/icons/icon38.png"/></button>
          <span id="controls">
            <button data-action="rewind" class="material-icons" title='${chrome.i18n.getMessage("rewind")}'>replay_10</button>
            <button data-action="slower" class="material-icons" title="${chrome.i18n.getMessage("slower")}">fast_rewind</button>
            <button data-action="play" title="${chrome.i18n.getMessage("play")}" class="material-icons">play_arrow</button>
            <button data-action="faster" class="material-icons" title="${chrome.i18n.getMessage("faster")}">fast_forward</button>
            <button data-action="share" title="${chrome.i18n.getMessage("share")}" class="material-icons">share</button>
            <button data-action="display" title="${chrome.i18n.getMessage("close")}" class="hideButton material-icons">close</button> 
            <span title="${chrome.i18n.getMessage("speed")}" class="speed-indicator">${speed}</span>
          </span>
          </div>
          <div id="cut-controls">
            <progress style="width: ${width};"></progress>
            <div class='progress-overlay-container'></div>
          </div>
          <div id='load-cut'>
            <select>
            <option value="" selected disabled hidden>${chrome.i18n.getMessage("loadCuts")}</option>
            </select>
          </div>
        </div>
      `;
      shadow.innerHTML = shadowTemplate;
      shadow.querySelector('#controller').addEventListener('mousedown', function (e) {
        runAction('drag', document, false, e, this);
      }.bind(this));
      // load cuts on mouseenter
      var draggable = shadow.querySelector('.draggable');
      var mouseEnterListener = null;
      function draggableMouseEnter(e) {
        if (this.currentCutId) {
          console.log('Loading cuts first time on mouseenter');
          this.loadCuts(this.currentCutId);
        }
        draggable.removeEventListener('mouseenter', mouseEnterListener);
      }
      mouseEnterListener = draggableMouseEnter.bind(this);
      draggable.addEventListener('mouseenter', mouseEnterListener);

      forEach.call(shadow.querySelectorAll('button'), function(button) {
        button.onclick = function(e) {
          runAction(e.target.dataset['action'], document, false, e, this);
        }.bind(this)
      }.bind(this));
      this.speedIndicator = shadow.querySelector('.speed-indicator');
      this.progress = shadow.querySelector('progress');
      this.progress.addEventListener('mousedown', function (e) {
        var pos = mousePositionElement(e);
        var pct = pos.x / this.progress.offsetWidth;
        if (!this.video.duration && this.video.paused) {
          this.video.play();
        } else {
          this.setCurrentTime(Math.round(this.video.duration * pct));
        }
      }.bind(this));
      this.progressOverlay = shadow.querySelector('div[class=progress-overlay-container]');
      this.playButton = shadow.querySelector('button[data-action=play]');
      this.cutButton = shadow.querySelector('.draggable.cut-button');
      var serverCuts = this.serverCuts = {};
      var select = this.select = shadow.querySelector('select');
      select.addEventListener("change", function() {
        this.loadCuts(select.value);
      }.bind(this));

      function loadExistingCuts() {
        var sources = this.video.querySelectorAll('source');
        var search_params = {'video_url': []};
        if (this.video.src) {
          search_params['video_url'].push(this.video.src);
        }
        if (this.video.currentSrc) {
          search_params['video_url'].push(this.video.currentSrc);
        }
        for (var i = 0; sources != null && i < sources.length; ++i) {
          search_params['video_url'].push(sources[i].src);
        }
        search_params['page_url'] = get_page_url();
        search_params['iframe_url'] = get_iframe_url();
        search_params['duration_ms'] = Math.round(this.video.duration * 1000);
        search_params['user_id'] = tc.settings.userId;
        console.log("Querying existing cuts:", search_params);
        $.getJSON(tc.settings.videoCutServer + '/videocuts.json', search_params, function( data ) {
          var items = [];
          $.each( data, function(index, item) {
            items.push( "<option value='" + item['id'] + "'>" + item['name'] + "</option>" );
            serverCuts[item['id']] = $.parseJSON(item['cuts']);
          });
          $(select).append(items.join(""));
          console.log('Downloaded ' + items.length + ' cuts from server', serverCuts);
          var cut_id = parseInt(get_parameter('__videocut_id'));
          if (cut_id && serverCuts[cut_id] !== null) {
            this.loadCuts(cut_id);
          }
        }.bind(this));
      }
      if (this.video.duration) {
        loadExistingCuts.bind(this)();
      } else {
        this.video.addEventListener('durationchange', loadExistingCuts.bind(this));
      }
      var fragment = document.createDocumentFragment();
      fragment.appendChild(wrapper);

      this.video.classList.add('vcc-initialized');
      this.video.dataset['vccid'] = this.id;

      switch (true) {
        case (location.hostname == 'www.amazon.com'):
        case (/hbogo\./).test(location.hostname):
          // insert before parent to bypass overlay
          this.parent.parentElement.insertBefore(fragment, this.parent);
          break;

        default:
          // Note: when triggered via a MutationRecord, it's possible that the
          // target is not the immediate parent. This appends the controller as
          // the first element of the target, which may not be the parent.
          this.parent.insertBefore(fragment, this.parent.firstChild);
      }
    }
  } // defineVideoController

  function initializeWhenReady(document) {
    escapeStringRegExp.matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;
    function escapeStringRegExp(str) {
      return str.replace(escapeStringRegExp.matchOperatorsRe, '\\$&');
    }

    var blacklisted = false;
    tc.settings.blacklist.split("\n").forEach(match => {
      var match = match.replace(/^\s+|\s+$/g,'')
      if (match.length == 0) {
        return;
      }

      var regexp = new RegExp(escapeStringRegExp(match));
      if (regexp.test(location.href)) {
        blacklisted = true;
        return;
      }
    })

    if (blacklisted)
      return;
    window.onload = () => initializeNow(document);
    if (document && document.doctype && document.doctype.name == "html") {
      if (document.readyState === "complete") {
        initializeNow(document);
      } else {
        document.onreadystatechange = () => {
          if (document.readyState === "complete") {
            initializeNow(document);
          }
        }
      }
    }
  }

  function initializeNow(document) {
      // enforce init-once due to redundant callers
      if (document.body.classList.contains('vcc-initialized')) {
        return;
      }
      document.body.classList.add('vcc-initialized');

      if (document === window.document) {
        defineVideoController();
      } else {
        var link = document.createElement('link');
        link.href = chrome.runtime.getURL('inject.css');
        link.type = 'text/css';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      document.addEventListener('keydown', function(event) {
        var keyCode = event.keyCode;

        // Ignore if following modifier is active.
        if (!event.getModifierState
            || event.getModifierState("Alt")
            || event.getModifierState("Control")
            || event.getModifierState("Fn")
            || event.getModifierState("Meta")
            || event.getModifierState("Hyper")
            || event.getModifierState("OS")) {
          return;
        }

        // Ignore keydown event if typing in an input box
        if ((document.activeElement.nodeName === 'INPUT'
              && document.activeElement.getAttribute('type') === 'text')
            || document.activeElement.nodeName === 'TEXTAREA'
            || document.activeElement.isContentEditable) {
          return false;
        }

        if (keyCode == tc.settings.rewindKeyCode) {
          runAction('rewind', document, true)
        } else if (keyCode == tc.settings.advanceKeyCode) {
          runAction('advance', document, true)
        } else if (keyCode == tc.settings.fasterKeyCode) {
          runAction('faster', document, true)
        } else if (keyCode == tc.settings.slowerKeyCode) {
          runAction('slower', document, true)
        } else if (keyCode == tc.settings.resetKeyCode) {
          runAction('reset', document, true)
        } else if (keyCode == tc.settings.displayKeyCode) {
          runAction('display', document, true)
        } else if (keyCode == tc.settings.fastKeyCode) {
          runAction('fast', document, true);
        } else if (keyCode == tc.settings.cutKeyCode) {
          runAction('cut', document, true);
        }
        return false;
      }, true);
      function checkForVideo(node, parent, added) {
        if (node.nodeName === 'VIDEO') {
          if (added) {
            new tc.videoController(node, parent);
          } else {
            if (node.classList.contains('vcc-initialized')) {
              let id = node.dataset['vccid'];
              let ctrl = document.querySelector(`div[data-vccid="${id}"]`)
              if (ctrl) {
                ctrl.remove();
              }
              node.classList.remove('vcc-initialized');
              delete node.dataset['vccid'];
            }
          }
        } else if (node.children != undefined) {
          for (var i = 0; i < node.children.length; i++) {
            checkForVideo(node.children[i],
                          node.children[i].parentNode || parent,
                          added);
          }
        }
      }
      var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          forEach.call(mutation.addedNodes, function(node) {
            if (typeof node === "function")
              return;
            checkForVideo(node, node.parentNode || mutation.target, true);
          })
          forEach.call(mutation.removedNodes, function(node) {
            if (typeof node === "function")
              return;
            checkForVideo(node, node.parentNode || mutation.target, false);
          })
        });
      });
      observer.observe(document, { childList: true, subtree: true });

      var videoTags = document.getElementsByTagName('video');
      forEach.call(videoTags, function(video) {
        new tc.videoController(video);
      });

      var frameTags = document.getElementsByTagName('iframe');
      forEach.call(frameTags, function(frame) {
        // Ignore frames we don't have permission to access (different origin).
        try { var childDocument = frame.contentDocument } catch (e) { return }
        initializeWhenReady(childDocument);
      });
  }

  function runAction(action, document, keyboard, e, videoController) {
    var videoTags = document.getElementsByTagName('video');
    videoTags.forEach = Array.prototype.forEach;

    videoTags.forEach(function(v) {
      var id = v.dataset['vccid'];
      var controller = document.querySelector(`div[data-vccid="${id}"]`);

      showController(controller);

      if (!v.classList.contains('vcc-cancelled')) {
        if (action === 'rewind') {
          v.controller.setCurrentTime(v.currentTime - tc.settings.rewindTime);
        } else if (action === 'advance') {
          v.controller.setCurrentTime(v.currentTime + tc.settings.advanceTime);
        } else if (action === 'faster') {
          // Maximum playback speed in Chrome is set to 16:
          // https://cs.chromium.org/chromium/src/media/blink/webmediaplayer_impl.cc?l=103
          var s = Math.min( (v.playbackRate < 0.1 ? 0.0 : v.playbackRate) + tc.settings.speedStep, 16);
          v.playbackRate = Number(s.toFixed(2));
        } else if (action === 'slower') {
          // Audio playback is cut at 0.05:
          // https://cs.chromium.org/chromium/src/media/filters/audio_renderer_algorithm.cc?l=49
          // Video min rate is 0.0625:
          // https://cs.chromium.org/chromium/src/media/blink/webmediaplayer_impl.cc?l=102
          var s = Math.max(v.playbackRate - tc.settings.speedStep, 0.0625);
          v.playbackRate = Number(s.toFixed(2));
        } else if (action === 'reset') {
          resetSpeed(v, 1.0);
        } else if (action === 'display') {
          controller.classList.add('vcc-manual');
          controller.classList.toggle('vcc-hidden');
        } else if (action === 'drag') {
          handleDrag(v, controller, e);
        } else if (action === 'fast') {
          resetSpeed(v, tc.settings.fastSpeed);
        } 
        
      }
    });
    if (videoController) {
      var v = videoController.video;
      if (action === 'play') {
        if (v.paused) {
          v.play();
        } else {
          v.pause();
        }
      } else if (action === 'cut') {
        v.controller.cut();
      } else if (action === 'share') {
        v.controller.shareCut();
      }
    }
  }

  function resetSpeed(v, target) {
    if (v.playbackRate === target) {
      v.playbackRate = tc.settings.resetSpeed;
    } else {
      tc.settings.resetSpeed = v.playbackRate;
      chrome.storage.sync.set({'resetSpeed': v.playbackRate});
      v.playbackRate = target;
    }
  }

  function handleDrag(video, controller, e) {
    const shadowController = controller.shadowRoot.querySelector('#controller');

    // Find nearest parent of same size as video parent.
    var parentElement = controller.parentElement;
    while (parentElement.parentNode &&
      parentElement.parentNode.offsetHeight === parentElement.offsetHeight &&
      parentElement.parentNode.offsetWidth === parentElement.offsetWidth) {
      parentElement = parentElement.parentNode;
    }

    video.classList.add('vcs-dragging');
    shadowController.classList.add('dragging');

    const initialMouseXY = [e.clientX, e.clientY];
    const initialControllerXY = [
      parseInt(shadowController.style.left),
      parseInt(shadowController.style.top)
    ];

    const startDragging = (e) => {
      let style = shadowController.style;
      let dx = e.clientX - initialMouseXY[0];
      let dy = e.clientY -initialMouseXY[1];
      style.left = (initialControllerXY[0] + dx) + 'px';
      style.top  = (initialControllerXY[1] + dy) + 'px';
    }

    const stopDragging = () => {
      parentElement.removeEventListener('mousemove', startDragging);
      parentElement.removeEventListener('mouseup', stopDragging);
      parentElement.removeEventListener('mouseleave', stopDragging);

      shadowController.classList.remove('dragging');
      video.classList.remove('vcs-dragging');
    }

    parentElement.addEventListener('mouseup',stopDragging);
    parentElement.addEventListener('mouseleave',stopDragging);
    parentElement.addEventListener('mousemove', startDragging);
  }

  var timer;
  var animation = false;
  function showController(controller) {
    controller.classList.add('vcs-show');

    if (animation)
      clearTimeout(timer);

    animation = true;
    timer = setTimeout(function() {
      controller.classList.remove('vcs-show');
      animation = false;
    }, 2000);
  }

  function get_title(d) {
    if (window.location.host === 'www.netflix.com') {
      var title = this.document.querySelector('div[class=ellipsize-text]');
      var text = []
      for (var i = 0; i < title.childNodes.length; ++i) {
        text.push(title.childNodes[i].innerText);
      }
      return text.join(" ");
    } else {
      var title = this.document.querySelector('title');
      if (title !== null) {
        title = title.innerText; 
      } else {
        title = '';
      }
      return title;
    }
  }

  function get_top_window_url() {
     return (window.location != window.parent.location)
            ? document.referrer
            : document.location.href;
  }  

  function get_page_url() {
    if (window.location.host === 'www.netflix.com') {
      return window.location.origin + window.location.pathname;
    } else {
      return get_top_window_url();
    }
  }

  function get_iframe_url() {
    return (window.location == window.parent.location)
            ? '' 
            : document.location.href;
  }

  function get_parameter(name) {
    var a = document.createElement('a'); 
    a.href = get_top_window_url()
    var query = a.search;
    var params = query.split(/[?&]/);
    for (var i = 0; i < params.length; ++i) {
      var param = params[i].split(/=/);
      if (param.length === 2 && param[0] === name) {
        return param[1];
      }
    }
    return null;
  }

  function log(msg, e) {
    var data = {
      user_id: tc.settings.userId,
      page_url: get_top_window_url(),
      message: msg,
    }; 
    if (e) {
      data['exception'] = e.stack;
    }
    $.post(tc.settings.videoCutServer + '/logs.json', data, function(response) {
      console.log("Posted log event", data);
    }, 'json');
  }
});
