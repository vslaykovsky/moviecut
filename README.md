# MovieCut

MovieCut is a Chrome extension that enables users to edit HTML5 videos on the fly by cutting out arbitrary parts and sharing results on [http://moviecut.online](http://moviecut.online)
On the following screenshot you can see the MovieCut controller floating on top of a video: 

![Player](https://github.com/vslaykovsky/moviecut/blob/master/images/videocut2.jpg?raw=true)

## Rationale  

There are lot of scenarios when you might want to remove some parts of the video:
- Opening, closing credits
- Ads in the middle of the movie
- 18+ content that you want to remove to show the video to your kids
- Boring parts, bad acting
- Keep only a few minute of the video showing the plot (recap of an episode of the show).
- Keep only one particular scene 
 
## Installation/Usage

First, install [Chrome Extension](https://chrome.google.com/webstore/detail/movie-cut/cchdbnepfilcfokfngamfpdkhbkkfilo)

Once the extension is installed simply navigate to any page that offers HTML5 video ([example](http://www.youtube.com/watch?v=E9FxNzv1Tr8)), and you'll see a speed indicator in top left corner. Hover over the indicator to reveal the controls to play/pause, start/end cutting, accelerate, slowdown, and quickly rewind the video. Or, even better, simply use your keyboard:

* **S** - decrease playback speed.
* **D** - increase playback speed.
* **R** - reset playback speed.
* **Z** - rewind video by 10 seconds.
* **V** - show/hide the controller.

_Note: you can customize these shortcut keys in the extension settings page and even make the extension remember your current playback speed._

## FAQ

**The video controls are not showing up?** This extension is only compatible with HTML5 video. If you don't see the controls showing up, chances are you are viewing a Flash video. If you want to confirm, try right-clicking on the video and inspect the menu: if it mentions flash, then that's the issue. That said, most sites will fallback to HTML5 if they detect that Flash it not available. You can try manually disabling Flash plugin in Chrome:

* In a new tab, navigate to `chrome://settings/content/flash`
* Disable "Allow sites to run Flash"
* Restart your browser and try playing your video again

**The speed controls are not showing up for local videos?** To enable playback of local media (e.g. File > Open File), you need to grant additional permissions to the extension.

* In a new tab, navigate to `chrome://extensions`
* Find "MovieCut" extension in the list and enable "Allow access to file URLs"
* Open a new tab and try opening a local file, the controls should show up


## License

(MIT License) - 2018 Vladimir Slaykovskiy

