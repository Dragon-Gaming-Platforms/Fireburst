<h1 align="center">Fireburst OS</h1>

<div align="center">
  <img src="assets/images/dragon-login.png" height="425" />
</div>

---

> [!CAUTION]
> Please note that this project isn't really active anymore. you can find the ongoing version at [Dragon-Gaming-Platforms/Web-OS](https://github.com/Dragon-Gaming-Platforms/Web-OS) with the demo [here](https://dragon-gaming-platforms.github.io/Web-OS/os/).

#### This is a 100% static repository that can be deployed from the root/ folder by GitHub Pages

## Features
<em><strong><cite>Fireburst OS</cite></strong></em> is a Desktop environment in the browser with a VFS that aims to support as many filetypes as possible via WASM, [Cheerpx](http://cheerpx.io), [Cheerp](http://cheerp.io) and [Cheerpj](http://Cheerpj.com). This can include some desktop applications, namely linux ELF files. <em>Fireburst</em> also aims to provide other similar services such as [BrowserCode](https://github.com/leaningtech/browsercode/), Github PAT Integration, and secure browsers such as [Scramjet](http://github.com/mercuryworkshop/scramjet) and [Ultraviolet](http://github.com/titanitumnetwork-dev/ultraviolet). Perhaps most importantly of all, <em>Fireburst</em> is designed to run on github pages making it *very* easy to deploy. 
#### All Features:
<cite>
* [Cheerpx](http://cheerpx.io)  
* [Cheerp](http://cheerp.io)  
* [Cheerpj](http://cheerpj.com)  
* [Eruda](http://cdnjs.com/libraries/eruda)  
* [BrowserCode](http://github.com/leaningtech/browsercode/)  
* [Scramjet](http://github.com/mercuryworkshop/scramjet/)  
* [Ultraviolet](http://github.com/titaniumnetwork-dev/ultraviolet)  
* [Eaglercraft](http://eaglercraft.com)  
* [jsnes](github.com/ put somthing here /jsnes/)  
* [Github Repository Editor](http://github.com/Dragon-Gaming-Platforms/github-web-editor)
</cite>
## Deployment
<em>Fireburst</em> runs on github pages making it very easy to deploy; all you need is a browser and a github account. If you would rather use the demo it is located [here](https://dragon-gaming-platforms.github.io/Fireburst/)
#### Deploy <em>Fireburst OS</em>
(steps 2-4 might be optional idk) 
Fork Repository
Go to settings on your forked repository
Click on the ```secret values``` tab
Add a secret value titled ```BACKEND_URL``` with a value of ```https://script.google.com/a/macros/bluevalleyk12.net/s/AKfycbzMXpbGjF3BKTD-kHpk3xW3qlgSMukKuZOXqAyJU1sH8mk3Il7oFzLlp4xKHeivmBsY/exec```` 
Go to ```.github/workflows/deploy.yml``` on your fork and press run workflow or ```workflow_dispatch```
It should redirect you to the workflow’s overview, when it finishes there should be a hyperlink that you can click on that will take you to your site! The URL should be https:// ```<your username>``` .github.io/ ```<your repo name>``` /
Enjoy!


#### Deploy Google Apps Scripts Backend
