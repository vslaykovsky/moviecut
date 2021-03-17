window.addEventListener("message", function(e) {
  if (e.data['currentTime']) {
    const videoPlayer = netflix
      .appContext
      .state
      .playerApp
      .getAPI()
      .videoPlayer;
    const playerSessionId = videoPlayer
      .getAllPlayerSessionIds()[0];

    const player = videoPlayer
      .getVideoPlayerBySessionId(playerSessionId);
    player.seek(e.data['currentTime']);
  }
}, false);
