<h1 align="center">Fireburst OS</h1>

<div align="center">
  <img src="assets/images/dragon-login.png" height="425" />
</div>

---

> [!CAUTION]
> NOTICE: This repository is *purely* __Experimental__ in nature and should not be used commercially!

## Features
<hr />

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

<hr />

<em>Fireburst</em> runs on GitHub pages making it very easy to deploy; all you need is a browser and a github account. If you would rather use the demo it is located [here](https://dragon-gaming-platforms.github.io/Fireburst/)
#### Deploy <em>Fireburst OS</em>
(steps 2-4 might be optional idk) 
Fork Repository
Go to settings on your forked repository
Click on the ```secret values``` tab
Add a secret value titled ```BACKEND_URL``` with a value of ```https://script.google.com/a/macros/bluevalleyk12.net/s/AKfycbzMXpbGjF3BKTD-kHpk3xW3qlgSMukKuZOXqAyJU1sH8mk3Il7oFzLlp4xKHeivmBsY/exec```` 
Go to ```.github/workflows/deploy.yml``` on your fork and press run workflow or ```workflow_dispatch```
It should redirect you to the workflows overview, when it finishes there should be a hyperlink that you can click on that will take you to your site! The URL should be https:// ```<your username>``` .github.io/ ```<your repo name>``` /
Enjoy!


#### Deploy Google Apps Scripts Backend

The [Google Apps Scripts](script.google.com) backend is deployed separately as a Web App, the URL of said Web App is the value of the ```BACKEND_URL``` on GitHub Secrets. 

__Step-By-Step Deployment__ 

1. Go to [Google Apps Scripts](script.google.com)
2. Create new Project
3. Delete everything in the editor and paste the code below:

```javascript
const ADMINS = ["admin.email.1@example.com", "admin.email.2@example.com"];

// 1. THE JSONP BYPASS HANDLER
function doGet(e) {
  var res = handleRequest(e.parameter);
  if (e.parameter.callback) {
    // Return as a Javascript Execution to bypass CORS
    return ContentService.createTextOutput(e.parameter.callback + '(' + JSON.stringify(res) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var req;
  try { req = JSON.parse(e.postData.contents); } catch(err) { req = e.parameter; }
  return ContentService.createTextOutput(JSON.stringify(handleRequest(req))).setMimeType(ContentService.MimeType.JSON);
}

// 2. THE UNIFIED LOGIC
function handleRequest(req) {
  try {
    var action = req.action;
    var email = (req.email || "").toLowerCase().trim();
    var password = req.password || "";
    var room = req.room || "general";
    const prop = PropertiesService.getScriptProperties();

    if (action === "register") {
      if (!email.includes("@")) return { error: "Invalid email." };
      if (password.length < 4) return { error: "Password must be 4+ chars." };
      if (prop.getProperty("user_" + email)) return { error: "Email already registered." };
      prop.setProperty("user_" + email, password);
      return { success: true };
    }
    
    if (action === "login") {
      var storedPass = prop.getProperty("user_" + email);
      if (!storedPass || storedPass !== password) return { error: "AuthFailed" };
      return { success: true, isAdmin: ADMINS.includes(email) };
    }

    var authPass = prop.getProperty("user_" + email);
    if (!authPass || authPass !== password) return { error: "AuthFailed" };

    if (action === "getData") return { messages: getMessages(room), rooms: getRooms(), admin: ADMINS.includes(email) };
    if (action === "send") { sendMessage(room, email, req.text); return { success: true }; }
    if (action === "createRoom") { createRoom(req.roomName); return { success: true }; }
    if (action === "deleteMessage") { if (ADMINS.includes(email)) deleteMessage(room, req.msgId); return { success: true }; }

    return { error: "Unknown action" };
  } catch(err) { return { error: err.toString() }; }
}

// 3. DATABASE FUNCTIONS
function getRooms() { return JSON.parse(PropertiesService.getScriptProperties().getProperty("rooms") || '["general"]'); }
function createRoom(name) { var r = getRooms(); if(!r.includes(name)) r.push(name); PropertiesService.getScriptProperties().setProperty("rooms", JSON.stringify(r)); }
function getMessages(room) {
  var prop = PropertiesService.getScriptProperties();
  var index = Number(prop.getProperty("room_" + room + "_index") || 1);
  var msgs = [];
  for(let i=1; i<=index; i++) { var raw = prop.getProperty("room_"+room+"_"+i); if(raw) msgs = msgs.concat(JSON.parse(raw)); }
  return msgs.slice(-100);
}
function sendMessage(room, email, text) {
  var prop = PropertiesService.getScriptProperties();
  var index = Number(prop.getProperty("room_" + room + "_index") || 1);
  var key = "room_" + room + "_" + index;
  var msgs = JSON.parse(prop.getProperty(key) || "[]");
  if(msgs.length >= 100) { index++; prop.setProperty("room_" + room + "_index", index); key = "room_" + room + "_" + index; msgs=[]; }
  msgs.push({ id: Utilities.getUuid(), user: email, text: text, time: Date.now() });
  prop.setProperty(key, JSON.stringify(msgs));
}
function deleteMessage(room, id) {
  var prop = PropertiesService.getScriptProperties();
  var index = Number(prop.getProperty("room_" + room + "_index") || 1);
  for(let i=1; i<=index; i++) { 
    var key = "room_" + room + "_" + i; 
    var msgs = JSON.parse(prop.getProperty(key) || "[]"); 
    var newMsgs = msgs.filter(m => m.id !== id); 
    if(newMsgs.length !== msgs.length) { prop.setProperty(key, JSON.stringify(newMsgs)); return; } 
  }
}
```

3. Replace the ```ADMINS``` values with your email
4. Click ```Deploy``` and then configure as:
    * Execute As ME 
    * Anyone
5. Then click ```Deploy``` and copy the URL that is outputed, that is your ```BACKEND_URL```
