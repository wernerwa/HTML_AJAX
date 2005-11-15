// Main.js
var HTML_AJAX = {
defaultServerUrl: false,
defaultEncoding: 'Null',
queues: false,
clientPools: {},
httpClient: function(name) {
if (name) {
if (this.clientPools[name]) {
return this.clientPools[name].getClient();
}
}
return this.clientPools['default'].getClient();
},
makeRequest: function(request) {
if (!HTML_AJAX.queues[request.queue]) {
var e = new Error('Unknown Queue: '+request.queue);
if (HTML_AJAX.onError) {
HTML_AJAX.onError(e);
return false;
}
else {
throw(e);
}
}
else {
var qn = request.queue;
var q = HTML_AJAX.queues[qn];
HTML_AJAX.queues[request.queue].addRequest(request);
return HTML_AJAX.queues[request.queue].processRequest();
}
},
serializerForEncoding: function(encoding) {
for(var i in HTML_AJAX.contentTypeMap) {
if (encoding == HTML_AJAX.contentTypeMap[i] || encoding == i) {
return eval("new HTML_AJAX_Serialize_"+i+";");
}
}
return new HTML_AJAX_Serialize_Null();
},
fullcall: function(url,encoding,className,method,callback,args, customHeaders) {
var serializer = HTML_AJAX.serializerForEncoding(encoding);
var request = new HTML_AJAX_Request(serializer);
if (callback) {
request.isAsync = true;
}
request.requestUrl = url;
request.className = className;
request.methodName = method;
request.callback = callback;
request.args = args;
if (customHeaders) {
request.customHeaders = customHeaders;
}
return HTML_AJAX.makeRequest(request);
},
call: function(className,method,callback) {
var args = new Array();
for(var i = 3; i < arguments.length; i++) {
args.push(arguments[i]);
}
return HTML_AJAX.fullcall(HTML_AJAX.defaultServerUrl,HTML_AJAX.defaultEncoding,className,method,callback,args);
},
grab: function(url,callback) {
return HTML_AJAX.fullcall(url,'Null',false,null,callback,{});
},
replace: function(id) {
var callback = function(result) {
document.getElementById(id).innerHTML = result;
}
if (arguments.length == 2) {
HTML_AJAX.grab(arguments[1],callback);
}
else {
var args = new Array();
for(var i = 3; i < arguments.length; i++) {
args.push(arguments[i]);
}
HTML_AJAX.fullcall(HTML_AJAX.defaultServerUrl,HTML_AJAX.defaultEncoding,arguments[1],arguments[2],callback,args);
}
},
append: function(id) {
var callback = function(result) {
document.getElementById(id).innerHTML += result;
}
if (arguments.length == 2) {
HTML_AJAX.grab(arguments[1],callback);
}
else {
var args = new Array();
for(var i = 3; i < arguments.length; i++) {
args.push(arguments[i]);
}
HTML_AJAX.fullcall(HTML_AJAX.defaultServerUrl,HTML_AJAX.defaultEncoding,arguments[1],arguments[2],callback,args);
}
},
Open: function(request) {
},
Load: function(request) {
},
contentTypeMap: {
'JSON':         'application/json',
'Null':         'text/plain',
'Error':        'application/error',
'PHP':          'application/php-serialized',
'Urlencoded':   'application/x-www-form-urlencoded'
},
requestComplete: function(request,error) {
for(var i in HTML_AJAX.queues) {
if (HTML_AJAX.queues[i].requestComplete) {
HTML_AJAX.queues[i].requestComplete(request,error);
}
}
},
formSubmit: function (form, target)
{
if (typeof form == 'string') {
form = document.getElementById(form);
if (!form) {
return false;
}
}
if (typeof target == 'string') {
target = document.getElementById('target');
if (!target) {
target = form;
}
}
var action = form.action;
var el, type, value, name, nameParts;
var out = '', tags = form.getElementsByTagName('*')
childLoop:
for (i in tags) {
el = tags[i];
if (!el || !el.getAttribute) {
continue;
}
name = el.getAttribute('name');
if (!name) {
continue;
}
type = el.nodeName.toLowerCase();
switch (type) {
case 'input':
var inpType = el.getAttribute('type');
switch (inpType) {
case 'submit':
type = 'button';
break;
case 'checkbox':
case 'radio':
if (el.checked) {
value = 'checked';
break;
}
continue childLoop;
case 'text':
default:
type = 'text';
break;
}
break;
case 'button':
case 'textarea':
case 'select':
break;
default:
continue childLoop;
}
if (typeof value == 'undefined') {
value = el.value;
}
out += escape(name) + '=' + escape(value) + '&';
value = undefined;
} // end childLoop
var callback = function(result) {
target.innerHTML = result;
}
switch (form.method.toLowerCase()) {
case 'post':
var headers = {};
headers['Content-Type'] = 'application/x-www-form-urlencoded';
HTML_AJAX.fullcall(action, 'Null', false, form.method, callback, out, headers);
break;
default:
if (action.indexOf('?') == -1) {
out = '?' + out.substr(0, out.length - 1);
}
HTML_AJAX.fullcall(action + out, 'Null', false, form.method, callback);
}
return true;
} // end formSubmit()
}
function HTML_AJAX_Serialize_Null() {}
HTML_AJAX_Serialize_Null.prototype = {
contentType: 'text/plain; charset=UTF-8;',
serialize: function(input) {
return new String(input).valueOf();
},
unserialize: function(input) {
return new String(input).valueOf();
}
}
function HTML_AJAX_Serialize_JSON() {}
HTML_AJAX_Serialize_JSON.prototype = {
contentType: 'application/json; charset=UTF-8',
serialize: function(input) {
return HTML_AJAX_JSON.stringify(input);
},
unserialize: function(input) {
try {
return eval(input);
} catch(e) {
return HTML_AJAX_JSON.parse(input);
}
}
}
function HTML_AJAX_Serialize_Error() {}
HTML_AJAX_Serialize_Error.prototype = {
contentType: 'application/error; charset=UTF-8',
serialize: function(input) {
var ser = new HTML_AJAX_Serialize_JSON();
return ser.serialize(input);
},
unserialize: function(input) {
var ser = new HTML_AJAX_Serialize_JSON();
var data = new ser.unserialize(input);
var e = new Error('PHP Error: '+data.errStr);
for(var i in data) {
e[i] = data[i];
}
throw e;
}
}
function HTML_AJAX_Queue_Immediate() {}
HTML_AJAX_Queue_Immediate.prototype = {
request: false,
addRequest: function(request) {
this.request = request;
},
processRequest: function() {
var client = HTML_AJAX.httpClient();
client.request = this.request;
return client.makeRequest();
}
}
function HTML_AJAX_Queue_Interval_SingleBuffer(interval) {
this.interval = interval;
}
HTML_AJAX_Queue_Interval_SingleBuffer.prototype = {
request: false,
_intervalId: false,
addRequest: function(request) {
this.request = request;
},
processRequest: function() {
if (!this._intervalId) {
this.runInterval();
this.start();
}
},
start: function() {
var self = this;
this._intervalId = setInterval(function() { self.runInterval() },this.interval);
},
stop: function() {
clearInterval(this._intervalId);
},
runInterval: function() {
if (this.request) {
var client = HTML_AJAX.httpClient();
client.request = this.request;
this.request = false;
client.makeRequest();
}
}
}
HTML_AJAX.queues = new Object();
HTML_AJAX.queues['default'] = new HTML_AJAX_Queue_Immediate();
// priorityQueue.js
function HTML_AJAX_Queue_Priority_Item(item, time) {
this.item = item;
this.time = time;
}
HTML_AJAX_Queue_Priority_Item.prototype = {
compareTo: function (other) {
var ret = this.item.compareTo(other.item);
if (ret == 0) {
ret = this.time - other.time;
}
return ret;
}
}
function HTML_AJAX_Queue_Priority_Simple(interval) {
this.interval = interval;
this.idleMax = 10;            // keep the interval going with an empty queue for 10 intervals
this.requestTimeout = 5;      // retry uncompleted requests after 5 seconds
this.checkRetryChance = 0.1;  // check for uncompleted requests to retry on 10% of intervals
this._intervalId = 0;
this._requests = [];
this._removed = [];
this._len = 0;
this._removedLen = 0;
this._idle = 0;
}
HTML_AJAX_Queue_Priority_Simple.prototype = {
isEmpty: function () {
return this._len == 0;
},
addRequest: function (request) {
request = new HTML_AJAX_Queue_Priority_Item(request, new Date().getTime());
++this._len;
if (this.isEmpty()) {
this._requests[0] = request;
return;
}
for (i = 0; i < this._len - 1; i++) {
if (request.compareTo(this._requests[i]) < 0) {
this._requests.splice(i, 1, request, this._requests[i]);
return;
}
}
this._requests.push(request);
},
peek: function () {
return (this.isEmpty() ? false : this._requests[0]);
},
requestComplete: function (request) {
for (i = 0; i < this._removedLen; i++) {
if (this._removed[i].item == request) {
this._removed.splice(i, 1);
--this._removedLen;
out('removed from _removed');
return true;
}
}
return false;
},
processRequest: function() {
if (!this._intervalId) {
this._runInterval();
this._start();
}
this._idle = 0;
},
_runInterval: function() {
if (Math.random() < this.checkRetryChance) {
this._doRetries();
}
if (this.isEmpty()) {
if (++this._idle > this.idleMax) {
this._stop();
}
return;
}
var client = HTML_AJAX.httpClient();
if (!client) {
return;
}
var request = this.peek();
if (!request) {
this._requests.splice(0, 1);
return;
}
client.request = request.item;
client.makeRequest();
this._requests.splice(0, 1);
--this._len;
this._removed[this._removedLen++] = new HTML_AJAX_Queue_Priority_Item(request, new Date().getTime());
},
_doRetries: function () {
for (i = 0; i < this._removedLen; i++) {
if (this._removed[i].time + this._requestTimeout < new Date().getTime()) {
this.addRequest(request.item);
this._removed.splice(i, 1);
--this._removedLen;
return true;
}
}
},
_start: function() {
var self = this;
this._intervalId = setInterval(function() { self._runInterval() }, this.interval);
},
_stop: function() {
clearInterval(this._intervalId);
this._intervalId = 0;
}
};
// clientPool.js
HTML_AJAX_Client_Pool = function(maxClients, startingClients)
{
this.maxClients = maxClients;
this._clients = [];
this._len = 0;
while (--startingClients > 0) {
this.addClient();
}
}
HTML_AJAX_Client_Pool.prototype = {
isEmpty: function()
{
return this._len == 0;
},
addClient: function()
{
if (this.maxClients != 0 && this._len > this.maxClients) {
return false;
}
var key = this._len++;
this._clients[key] = new HTML_AJAX_HttpClient();
return this._clients[key];
},
getClient: function ()
{
for (i = 0; i < this._len; i++) {
if (!this._clients[i].callInProgress()) {
return this._clients[i];
}
}
var client = this.addClient();
if (client) {
return client;
}
return false;
},
removeClient: function (client)
{
for (i = 0; i < this._len; i++) {
if (!this._clients[i] == client) {
this._clients.splice(i, 1);
return true;
}
}
return false;
},
clear: function ()
{
this._clients = [];
this._len = 0;
}
};
HTML_AJAX.clientPools['default'] = new HTML_AJAX_Client_Pool(0);
// serializer/UrlSerializer.js
function HTML_AJAX_Serialize_Urlencoded() {}
HTML_AJAX_Serialize_Urlencoded.prototype = {
contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
base: '_HTML_AJAX',
_keys: [],
error: false,
message: "",
cont: "",
serialize: function(input, _internal) {
if (typeof input == 'undefined') {
return '';
}
if (!_internal) {
this._keys = [];
}
var ret = '', first = true;
for (i = 0; i < this._keys.length; i++) {
ret += (first ? escape(this._keys[i]) : '[' + escape(this._keys[i]) + ']');
first = false;
}
ret += '=';
switch (HTML_AJAX_Util.getType(input)) {
case 'string':
case 'number':
ret += escape(input.toString());
break;
case 'boolean':
ret += (input ? '1' : '0');
break;
case 'array':
case 'object':
ret = '';
for (i in input) {
this._keys.push(i);
ret += this.serialize(input[i], true) + '&';
this._keys.pop();
}
ret = ret.substr(0, ret.length - 1);
}
return ret;
},
unserialize: function(input) {
if (!input.length || input.length == 0) {
return;
}
if (!/^(?:\w+(?:\[[^\[\]]*\])*=[^&]*(?:&|$))+$/.test(input)) {
this.raiseError("invalidly formed input", input);
return;
}
input = input.split("&");
var pos, key, keys, val, _HTML_AJAX = [];
if (input.length == 1) {
return unescape(input[0].substr(this.base.length + 1));
}
for (var i in input) {
pos = input[i].indexOf("=");
if (pos < 1 || input[i].length - pos - 1 < 1) {
this.raiseError("input is too short", input[i]);
return;
}
key = unescape(input[i].substr(0, pos));
val = unescape(input[i].substr(pos + 1));
key = key.replace(/\[((?:\d*\D+)+)\]/g, '["$1"]');
keys = key.split(']');
for (j in keys) {
if (!keys[j].length || keys[j].length == 0) {
continue;
}
try {
if (eval('typeof ' + keys[j] + ']') == 'undefined') {
var ev = keys[j] + ']=[];';
eval(ev);
}
} catch (e) {
this.raiseError("error evaluating key", ev);
return;
}
}
try {
eval(key + '="' + val + '";');
} catch (e) {
this.raiseError("error evaluating value", input);
return;
}
}
return _HTML_AJAX;
},
getError: function() {
return this.message + "\n" + this.cont;
},
raiseError: function(message, cont) {
this.error = 1;
this.message = message;
this.cont = cont;
}
}
// serializer/phpSerializer.js
function HTML_AJAX_Serialize_PHP() {}
HTML_AJAX_Serialize_PHP.prototype = {
error: false,
message: "",
cont: "",
defaultEncoding: 'UTF-8',
contentType: 'application/php-serialized; charset: UTF-8',
serialize: function(inp) {
var type = HTML_AJAX_Util.getType(inp);
var val;
switch (type) {
case "undefined":
val = "N";
break;
case "boolean":
val = "b:" + (inp ? "1" : "0");
break;
case "number":
val = (Math.round(inp) == inp ? "i" : "d") + ":" + inp;
break;
case "string":
val = "s:" + inp.length + ":\"" + inp + "\"";
break;
case "array":
val = "a";
case "object":
if (type == "object") {
var objname = inp.constructor.toString().match(/(\w+)\(\)/);
if (objname == undefined) {
return;
}
objname[1] = this.serialize(objname[1]);
val = "O" + objname[1].substring(1, objname[1].length - 1);
}
var count = 0;
var vals = "";
var okey;
for (key in inp) {
okey = (key.match(/^[0-9]+$/) ? parseInt(key) : key);
vals += this.serialize(okey) +
this.serialize(inp[key]);
count++;
}
val += ":" + count + ":{" + vals + "}";
break;
}
if (type != "object" && type != "array") val += ";";
return val;
},
unserialize: function(inp) {
this.error = 0;
if (inp == "" || inp.length < 2) {
this.raiseError("input is too short");
return;
}
var val, kret, vret, cval;
var type = inp.charAt(0);
var cont = inp.substring(2);
var size = 0, divpos = 0, endcont = 0, rest = "", next = "";
switch (type) {
case "N": // null
if (inp.charAt(1) != ";") {
this.raiseError("missing ; for null", cont);
}
rest = cont;
break;
case "b": // boolean
if (!/[01];/.test(cont.substring(0,2))) {
this.raiseError("value not 0 or 1, or missing ; for boolean", cont);
}
val = (cont.charAt(0) == "1");
rest = cont.substring(1);
break;
case "s": // string
val = "";
divpos = cont.indexOf(":");
if (divpos == -1) {
this.raiseError("missing : for string", cont);
break;
}
size = parseInt(cont.substring(0, divpos));
if (size == 0) {
if (cont.length - divpos < 4) {
this.raiseError("string is too short", cont);
break;
}
rest = cont.substring(divpos + 4);
break;
}
if ((cont.length - divpos - size) < 4) {
this.raiseError("string is too short", cont);
break;
}
if (cont.substring(divpos + 2 + size, divpos + 4 + size) != "\";") {
this.raiseError("string is too long, or missing \";", cont);
}
val = cont.substring(divpos + 2, divpos + 2 + size);
rest = cont.substring(divpos + 4 + size);
break;
case "i": // integer
case "d": // float
var dotfound = 0;
for (var i = 0; i < cont.length; i++) {
cval = cont.charAt(i);
if (isNaN(parseInt(cval)) && !(type == "d" && cval == "." && !dotfound++)) {
endcont = i;
break;
}
}
if (!endcont || cont.charAt(endcont) != ";") {
this.raiseError("missing or invalid value, or missing ; for int/float", cont);
}
val = cont.substring(0, endcont);
val = (type == "i" ? parseInt(val) : parseFloat(val));
rest = cont.substring(endcont + 1);
break;
case "a": // array
if (cont.length < 4) {
this.raiseError("array is too short", cont);
return;
}
divpos = cont.indexOf(":", 1);
if (divpos == -1) {
this.raiseError("missing : for array", cont);
return;
}
size = parseInt(cont.substring(1, divpos - 1));
cont = cont.substring(divpos + 2);
val = new Array();
if (cont.length < 1) {
this.raiseError("array is too short", cont);
return;
}
for (var i = 0; i + 1 < size * 2; i += 2) {
kret = this.unserialize(cont, 1);
if (this.error || kret[0] == undefined || kret[1] == "") {
this.raiseError("missing or invalid key, or missing value for array", cont);
return;
}
vret = this.unserialize(kret[1], 1);
if (this.error) {
this.raiseError("invalid value for array", cont);
return;
}
val[kret[0]] = vret[0];
cont = vret[1];
}
if (cont.charAt(0) != "}") {
this.raiseError("missing ending }, or too many values for array", cont);
return;
}
rest = cont.substring(1);
break;
case "O": // object
divpos = cont.indexOf(":");
if (divpos == -1) {
this.raiseError("missing : for object", cont);
return;
}
size = parseInt(cont.substring(0, divpos));
var objname = cont.substring(divpos + 2, divpos + 2 + size);
if (cont.substring(divpos + 2 + size, divpos + 4 + size) != "\":") {
this.raiseError("object name is too long, or missing \":", cont);
return;
}
var objprops = this.unserialize("a:" + cont.substring(divpos + 4 + size), 1);
if (this.error) {
this.raiseError("invalid object properties", cont);
return;
}
rest = objprops[1];
var objout = "function " + objname + "(){";
for (key in objprops[0]) {
objout += "this." + key + "=objprops[0]['" + key + "'];";
}
objout += "}val=new " + objname + "();";
eval(objout);
break;
default:
this.raiseError("invalid input type", cont);
}
return (arguments.length == 1 ? val : [val, rest]);
},
getError: function() {
return this.message + "\n" + this.cont;
},
raiseError: function(message, cont) {
this.error = 1;
this.message = message;
this.cont = cont;
}
}
// Dispatcher.js
function HTML_AJAX_Dispatcher(className,mode,callback,serverUrl,serializerType)
{
this.className = className;
this.mode = mode;
this.callback = callback;
this.serializerType = serializerType;
if (serverUrl) {
this.serverUrl = serverUrl
}
else {
this.serverUrl = window.location;
}
}
HTML_AJAX_Dispatcher.prototype = {
queue: 'default',
timeout: 20000,
priority: 0,
doCall: function(callName,args)
{
var request = new HTML_AJAX_Request();
request.requestUrl = this.serverUrl;
request.className = this.className;
request.methodName = callName;
request.timeout = this.timeout;
request.contentType = this.contentType;
request.serializer = eval('new HTML_AJAX_Serialize_'+this.serializerType);
request.queue = this.queue;
request.priority = this.priority;
for(var i=0; i < args.length; i++) {
request.addArg(i,args[i]);
};
if ( this.mode == "async" ) {
request.isAsync = true;
if (this.callback[callName]) {
var self = this;
request.callback = function(result) { self.callback[callName](result); }
}
} else {
request.isAsync = false;
}
return HTML_AJAX.makeRequest(request);
},
Sync: function()
{
this.mode = 'sync';
},
Async: function(callback)
{
this.mode = 'async';
if (callback) {
this.callback = callback;
}
}
};
// HttpClient.js
function HTML_AJAX_HttpClient() { }
HTML_AJAX_HttpClient.prototype = {
request: null,
_timeoutId: null,
init:function()
{
try {
this.xmlhttp = new XMLHttpRequest();
} catch (e) {
var XMLHTTP_IDS = new Array(
'MSXML2.XMLHTTP.5.0',
'MSXML2.XMLHTTP.4.0',
'MSXML2.XMLHTTP.3.0',
'MSXML2.XMLHTTP',
'Microsoft.XMLHTTP' );
var success = false;
for (var i=0;i < XMLHTTP_IDS.length && !success; i++) {
try {
this.xmlhttp = new ActiveXObject(XMLHTTP_IDS[i]);
success = true;
} catch (e) {}
}
if (!success) {
throw new Error('Unable to create XMLHttpRequest.');
}
}
},
callInProgress: function()
{
switch ( this.xmlhttp.readyState ) {
case 1:
case 2:
case 3:
return true;
break;
default:
return false;
break;
}
},
makeRequest: function()
{
if (!this.xmlhttp) {
this.init();
}
try {
if (this.request.Open) {
this.request.Open();
}
else if (HTML_AJAX.Open) {
HTML_AJAX.Open(this.request);
}
var self = this;
this.xmlhttp.onreadystatechange = function() { self._readyStateChangeCallback(); }
this.xmlhttp.open(this.request.requestType,this.request.completeUrl(),this.request.isAsync);
if (this.request.customHeaders) {
for (i in this.request.customHeaders) {
this.xmlhttp.setRequestHeader(i, this.request.customHeaders[i]);
}
}
if (this.request.customHeaders && !this.request.customHeaders['Content-Type']) {
this.xmlhttp.setRequestHeader('Content-Type',this.request.getContentType());
}
var payload = this.request.getSerializedPayload();
if (payload) {
this.xmlhttp.setRequestHeader('Content-Length', payload.length);
}
this.xmlhttp.send(payload);
if (!this.request.isAsync) {
if ( this.xmlhttp.status == 200 ) {
HTML_AJAX.requestComplete(this.request);
if (this.request.Load) {
this.request.Load();
} else if (HTML_AJAX.Load) {
HTML_AJAX.Load(this.request);
}
return this._decodeResponse();
} else {
var e = new Error('['+this.xmlhttp.status +'] '+this.xmlhttp.statusText);
e.headers = this.xmlhttp.getAllResponseHeaders();
this._handleError(e);
}
}
else {
var self = this;
this._timeoutId = window.setTimeout(function() { self.abort(true); },this.request.timeout);
}
} catch (e) {
this._handleError(e);
}
},
abort: function (automatic)
{
if (this.callInProgress()) {
this.xmlhttp.abort();
if (automatic) {
this._handleError(new Error('Request Timed Out'));
}
}
},
_readyStateChangeCallback:function()
{
try {
switch(this.xmlhttp.readyState) {
case 1:
break;
case 2:
if (this.request.Send) {
this.request.Send();
} else if (HTML_AJAX.Send) {
HTML_AJAX.Send(this.request);
}
break;
case 3:
if (this.request.Progress) {
this.request.Progress();
} else if (HTML_AJAX.Progress ) {
HTML_AJAX.Progress(this.request);
}
break;
case 4:
window.clearTimeout(this._timeout_id);
if (this.xmlhttp.status == 200) {
HTML_AJAX.requestComplete(this.request);
if (this.request.Load) {
this.request.Load();
} else if (HTML_AJAX.Load ) {
HTML_AJAX.Load(this.request);
}
if (this.request.callback) {
this.request.callback(this._decodeResponse());
}
}
else {
var e = new Error('HTTP Error Making Request: ['+this.xmlhttp.status+'] '+this.xmlhttp.statusText);
this._handleError(e);
}
break;
}
} catch (e) {
this._handleError(e);
}
},
_decodeResponse: function() {
var unserializer = HTML_AJAX.serializerForEncoding(this.xmlhttp.getResponseHeader('Content-Type'));
return unserializer.unserialize(this.xmlhttp.responseText);
},
_handleError: function(e)
{
HTML_AJAX.requestComplete(this.request,e);
if (this.request.onError) {
this.request.onError(e);
} else if (HTML_AJAX.onError) {
HTML_AJAX.onError(e,this.request);
}
else {
throw e;
}
}
}
// Request.js
function HTML_AJAX_Request(serializer) {
this.serializer = serializer;
}
HTML_AJAX_Request.prototype = {
serializer: null,
isAsync: false,
requestType: 'POST',
requestUrl: '',
className: null,
methodName: null,
timeout: 20000,
args: null,
callback: null,
queue: 'default',
priority: 0,
customHeaders: {},
addArg: function(name, value)
{
if ( !this.args ) {
this.args = [];
}
if (!/[^a-zA-Z_0-9]/.test(name) ) {
this.args[name] = value;
} else {
throw new Error('Invalid parameter name ('+name+')');
}
},
getSerializedPayload: function() {
return this.serializer.serialize(this.args);
},
getContentType: function() {
return this.serializer.contentType;
},
completeUrl: function() {
var url = new String(this.requestUrl);
var delimiter = '?';
if (url.indexOf('?') >= 0) {
delimiter = '&';
}
if (this.className || this.methodName) {
url += delimiter+'c='+escape(this.className)+'&m='+escape(this.methodName);
}
return url;
},
compareTo: function(other) {
if (this.priority == other.priority) {
return 0;
}
return (this.priority > other.priority ? 1 : -1);
}
}
// serializer/JSON.js
Array.prototype.______array = '______array';
var HTML_AJAX_JSON = {
org: 'http://www.JSON.org',
copyright: '(c)2005 JSON.org',
license: 'http://www.crockford.com/JSON/license.html',
stringify: function (arg) {
var c, i, l, s = '', v;
switch (typeof arg) {
case 'object':
if (arg) {
if (arg.______array == '______array') {
for (i = 0; i < arg.length; ++i) {
v = this.stringify(arg[i]);
if (s) {
s += ',';
}
s += v;
}
return '[' + s + ']';
} else if (typeof arg.toString != 'undefined') {
for (i in arg) {
v = arg[i];
if (typeof v != 'undefined' && typeof v != 'function') {
v = this.stringify(v);
if (s) {
s += ',';
}
s += this.stringify(i) + ':' + v;
}
}
return '{' + s + '}';
}
}
return 'null';
case 'number':
return isFinite(arg) ? String(arg) : 'null';
case 'string':
l = arg.length;
s = '"';
for (i = 0; i < l; i += 1) {
c = arg.charAt(i);
if (c >= ' ') {
if (c == '\\' || c == '"') {
s += '\\';
}
s += c;
} else {
switch (c) {
case '\b':
s += '\\b';
break;
case '\f':
s += '\\f';
break;
case '\n':
s += '\\n';
break;
case '\r':
s += '\\r';
break;
case '\t':
s += '\\t';
break;
default:
c = c.charCodeAt();
s += '\\u00' + Math.floor(c / 16).toString(16) +
(c % 16).toString(16);
}
}
}
return s + '"';
case 'boolean':
return String(arg);
default:
return 'null';
}
},
parse: function (text) {
var at = 0;
var ch = ' ';
function error(m) {
throw {
name: 'JSONError',
message: m,
at: at - 1,
text: text
};
}
function next() {
ch = text.charAt(at);
at += 1;
return ch;
}
function white() {
while (ch) {
if (ch <= ' ') {
next();
} else if (ch == '/') {
switch (next()) {
case '/':
while (next() && ch != '\n' && ch != '\r') {}
break;
case '*':
next();
for (;;) {
if (ch) {
if (ch == '*') {
if (next() == '/') {
next();
break;
}
} else {
next();
}
} else {
error("Unterminated comment");
}
}
break;
default:
error("Syntax error");
}
} else {
break;
}
}
}
function string() {
var i, s = '', t, u;
if (ch == '"') {
outer:          while (next()) {
if (ch == '"') {
next();
return s;
} else if (ch == '\\') {
switch (next()) {
case 'b':
s += '\b';
break;
case 'f':
s += '\f';
break;
case 'n':
s += '\n';
break;
case 'r':
s += '\r';
break;
case 't':
s += '\t';
break;
case 'u':
u = 0;
for (i = 0; i < 4; i += 1) {
t = parseInt(next(), 16);
if (!isFinite(t)) {
break outer;
}
u = u * 16 + t;
}
s += String.fromCharCode(u);
break;
default:
s += ch;
}
} else {
s += ch;
}
}
}
error("Bad string");
}
function array() {
var a = [];
if (ch == '[') {
next();
white();
if (ch == ']') {
next();
return a;
}
while (ch) {
a.push(value());
white();
if (ch == ']') {
next();
return a;
} else if (ch != ',') {
break;
}
next();
white();
}
}
error("Bad array");
}
function object() {
var k, o = {};
if (ch == '{') {
next();
white();
if (ch == '}') {
next();
return o;
}
while (ch) {
k = string();
white();
if (ch != ':') {
break;
}
next();
o[k] = value();
white();
if (ch == '}') {
next();
return o;
} else if (ch != ',') {
break;
}
next();
white();
}
}
error("Bad object");
}
function number() {
var n = '', v;
if (ch == '-') {
n = '-';
next();
}
while (ch >= '0' && ch <= '9') {
n += ch;
next();
}
if (ch == '.') {
n += '.';
while (next() && ch >= '0' && ch <= '9') {
n += ch;
}
}
if (ch == 'e' || ch == 'E') {
n += 'e';
next();
if (ch == '-' || ch == '+') {
n += ch;
next();
}
while (ch >= '0' && ch <= '9') {
n += ch;
next();
}
}
v = +n;
if (!isFinite(v)) {
} else {
return v;
}
}
function word() {
switch (ch) {
case 't':
if (next() == 'r' && next() == 'u' && next() == 'e') {
next();
return true;
}
break;
case 'f':
if (next() == 'a' && next() == 'l' && next() == 's' &&
next() == 'e') {
next();
return false;
}
break;
case 'n':
if (next() == 'u' && next() == 'l' && next() == 'l') {
next();
return null;
}
break;
}
error("Syntax error");
}
function value() {
white();
switch (ch) {
case '{':
return object();
case '[':
return array();
case '"':
return string();
case '-':
return number();
default:
return ch >= '0' && ch <= '9' ? number() : word();
}
}
return value();
}
};
// Loading.js
HTML_AJAX.Open = function(request) {
var loading = document.getElementById('HTML_AJAX_LOADING');
if (!loading) {
loading = document.createElement('div');
loading.id = 'HTML_AJAX_LOADING';
loading.innerHTML = 'Loading...';
loading.style.position = 'absolute';
loading.style.top = 0;
loading.style.right = 0;
loading.style.backgroundColor = 'red';
loading.style.width = '80px';
loading.style.padding = '4px';
document.body.insertBefore(loading,document.body.firstChild);
}
if (request.isAsync) {
HTML_AJAX.onOpen_Timeout = window.setTimeout(function() { loading.style.display = 'block'; },500);
}
else {
loading.style.display = 'block';
}
}
HTML_AJAX.Load = function(request) {
if (HTML_AJAX.onOpen_Timeout) {
window.clearTimeout(HTML_AJAX.onOpen_Timeout);
HTML_AJAX.onOpen_Timeout = false;
}
var loading = document.getElementById('HTML_AJAX_LOADING');
if (loading) {
loading.style.display = 'none';
}
}
// util.js
var HTML_AJAX_Util = {
registerEvent: function(element, event, handler)
{
if (typeof element.addEventListener != "undefined") {   //Dom2
element.addEventListener(event, handler, false);
} else if (typeof element.attachEvent != "undefined") { //IE 5+
element.attachEvent("on" + event, handler);
} else {
if (element["on" + event] != null) {
var oldHandler = element["on" + event];
element["on" + event] = function(e) {
oldHander(e);
handler(e);
};
} else {
element["on" + event] = handler;
}
}
},
eventTarget: function(event)
{
if (!event) var event = window.event;
if (event.target) return event.target; // w3c
if (event.srcElement) return event.srcElement; // ie 5
},
getType: function(inp)
{
var type = typeof inp, match;
if (type == "object") {
try {
inp.constructor;
} catch (e) {
return 'object';
}
var cons = inp.constructor.toString();
if (match = cons.match(/(\w+)\(/)) {
cons = match[1].toLowerCase();
}
var types = ["boolean", "number", "string", "array"];
for (key in types) {
if (cons == types[key]) {
type = types[key];
break;
}
}
}
return type;
},
strRepeat: function(inp, multiplier) {
var ret = "";
while (--multiplier > 0) ret += inp;
return ret;
},
varDump: function(inp, printFuncs, _indent, _recursionLevel)
{
if (!_recursionLevel) _recursionLevel = 0;
if (!_indent) _indent = 1;
var tab = this.strRepeat("  ", ++_indent);
var type = this.getType(inp), out = type;
var consrx = /(\w+)\(/;
consrx.compile();
if (++_recursionLevel > 6) {
return tab + inp + "Loop Detected\n";
}
switch (type) {
case "boolean":
case "number":
out += "(" + inp.toString() + ")";
break;
case "string":
out += "(" + inp.length + ") \"" + inp + "\"";
break;
case "function":
if (printFuncs) {
out += inp.toString().replace(/\n/g, "\n" + tab);
}
break;
case "array":
case "object":
var atts = "", attc = 0;
try {
for (k in inp) {
atts += tab + "[" + (/\D/.test(k) ? "\"" + k + "\"" : k)
+ "]=>\n" + tab + this.varDump(inp[k], printFuncs, _indent, _recursionLevel);
++attc;
}
} catch (e) {}
if (type == "object") {
var objname, objstr = inp.toString();
if (objname = objstr.match(/^\[object (\w+)\]$/)) {
objname = objname[1];
} else {
try {
objname = inp.constructor.toString().match(consrx)[1];
} catch (e) {
objname = 'unknown';
}
}
out += "(" + objname + ") ";
}
out += "(" + attc + ") {\n" + atts + this.strRepeat("  ", _indent - 1) +"}";
break;
}
return out + "\n";
},
quickPrint: function(input) {
var ret = "";
for(var i in input) {
ret += i+':'+input[i]+"\n";
}
return ret;
},
getAllElementsByTag: function(parentElement)
{
if(!parentElement) {
var allElements = document.all;
}
else
{
var allElements = [], rightName = new RegExp( parentElement, 'i' ), i;
for( i=0; i<document.all.length; i++ ) {
if( rightName.test( document.all[i].parentElement ) )
allElements.push( document.all[i] );
}
}
return allElements;
},
getElementsByClassName: function(className, parentElement) {
if( document.all && !document.getElementsByTagName )
{
var allElements = HTML_AJAX_Util.getAllElementsByTag(parentElement);
}
else
{
if (!parentElement) { parentElement = document.body; }
var allElements = parentElement.getElementsByTagName('*');
}
var items = [];
var exp = new RegExp('(^| )' + className + '( |$)');
for(var i=0,j=allElements.length; i<j; i++)
{
if(exp.test(allElements[i].className))
{
items.push(allElements[i]);
}
}
return items;
},
htmlEscape: function(inp) {
var rxp, chars = [
['&', '&amp;'],
['<', '&lt;'],
['>', '&gt;']
];
for (i in chars) {
inp.replace(new RegExp(chars[i][0]), chars[i][1]);
}
return inp;
}
}
// behavior/behavior.js
var Behavior = {
list : new Array(),
addLoadEvent : function(func) {
var oldonload = window.onload;
if (typeof window.onload != 'function') {
window.onload = func;
} else {
window.onload = function() {
oldonload();
func();
}
}
},
apply : function() {
for (i = 0; i < Behavior.list.length; i++) {
var rule = Behavior.list[i];
var tags = cssQuery(rule.selector, rule.from);
if (tags) {
for (j = 0; j < tags.length; j++) {
rule.action(tags[j]);
}
}
}
},
register : function(selector, action, from) {
Behavior.list.push(new BehaviorRule(selector, from, action));
},
start : function() {
Behavior.addLoadEvent(function() {
Behavior.apply();
});
}
}
function BehaviorRule(selector, from, action) {
this.selector = selector;
this.from = from;
this.action = action;
}
Behavior.start();
// behavior/cssQuery-p.js
eval(function(p,a,c,k,e,d){e=function(c){return(c<a?'':e(parseInt(c/a)))+((c=c%a)>35?String.fromCharCode(c+29):c.toString(36))};if(!''.replace(/^/,String)){while(c--)d[e(c)]=k[c]||e(c);k=[function(e){return d[e]}];e=function(){return'\\w+'};c=1};while(c--)if(k[c])p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c]);return p}('7 x=6(){7 1D="2.0.2";7 C=/\\s*,\\s*/;7 x=6(s,A){33{7 m=[];7 u=1z.32.2c&&!A;7 b=(A)?(A.31==22)?A:[A]:[1g];7 1E=18(s).1l(C),i;9(i=0;i<1E.y;i++){s=1y(1E[i]);8(U&&s.Z(0,3).2b("")==" *#"){s=s.Z(2);A=24([],b,s[1])}1A A=b;7 j=0,t,f,a,c="";H(j<s.y){t=s[j++];f=s[j++];c+=t+f;a="";8(s[j]=="("){H(s[j++]!=")")a+=s[j];a=a.Z(0,-1);c+="("+a+")"}A=(u&&V[c])?V[c]:21(A,t,f,a);8(u)V[c]=A}m=m.30(A)}2a x.2d;5 m}2Z(e){x.2d=e;5[]}};x.1Z=6(){5"6 x() {\\n  [1D "+1D+"]\\n}"};7 V={};x.2c=L;x.2Y=6(s){8(s){s=1y(s).2b("");2a V[s]}1A V={}};7 29={};7 19=L;x.15=6(n,s){8(19)1i("s="+1U(s));29[n]=12 s()};x.2X=6(c){5 c?1i(c):o};7 D={};7 h={};7 q={P:/\\[([\\w-]+(\\|[\\w-]+)?)\\s*(\\W?=)?\\s*([^\\]]*)\\]/};7 T=[];D[" "]=6(r,f,t,n){7 e,i,j;9(i=0;i<f.y;i++){7 s=X(f[i],t,n);9(j=0;(e=s[j]);j++){8(M(e)&&14(e,n))r.z(e)}}};D["#"]=6(r,f,i){7 e,j;9(j=0;(e=f[j]);j++)8(e.B==i)r.z(e)};D["."]=6(r,f,c){c=12 1t("(^|\\\\s)"+c+"(\\\\s|$)");7 e,i;9(i=0;(e=f[i]);i++)8(c.l(e.1V))r.z(e)};D[":"]=6(r,f,p,a){7 t=h[p],e,i;8(t)9(i=0;(e=f[i]);i++)8(t(e,a))r.z(e)};h["2W"]=6(e){7 d=Q(e);8(d.1C)9(7 i=0;i<d.1C.y;i++){8(d.1C[i]==e)5 K}};h["2V"]=6(e){};7 M=6(e){5(e&&e.1c==1&&e.1f!="!")?e:23};7 16=6(e){H(e&&(e=e.2U)&&!M(e))28;5 e};7 G=6(e){H(e&&(e=e.2T)&&!M(e))28;5 e};7 1r=6(e){5 M(e.27)||G(e.27)};7 1P=6(e){5 M(e.26)||16(e.26)};7 1o=6(e){7 c=[];e=1r(e);H(e){c.z(e);e=G(e)}5 c};7 U=K;7 1h=6(e){7 d=Q(e);5(2S d.25=="2R")?/\\.1J$/i.l(d.2Q):2P(d.25=="2O 2N")};7 Q=6(e){5 e.2M||e.1g};7 X=6(e,t){5(t=="*"&&e.1B)?e.1B:e.X(t)};7 17=6(e,t,n){8(t=="*")5 M(e);8(!14(e,n))5 L;8(!1h(e))t=t.2L();5 e.1f==t};7 14=6(e,n){5!n||(n=="*")||(e.2K==n)};7 1e=6(e){5 e.1G};6 24(r,f,B){7 m,i,j;9(i=0;i<f.y;i++){8(m=f[i].1B.2J(B)){8(m.B==B)r.z(m);1A 8(m.y!=23){9(j=0;j<m.y;j++){8(m[j].B==B)r.z(m[j])}}}}5 r};8(![].z)22.2I.z=6(){9(7 i=0;i<1z.y;i++){o[o.y]=1z[i]}5 o.y};7 N=/\\|/;6 21(A,t,f,a){8(N.l(f)){f=f.1l(N);a=f[0];f=f[1]}7 r=[];8(D[t]){D[t](r,A,f,a)}5 r};7 S=/^[^\\s>+~]/;7 20=/[\\s#.:>+~()@]|[^\\s#.:>+~()@]+/g;6 1y(s){8(S.l(s))s=" "+s;5 s.P(20)||[]};7 W=/\\s*([\\s>+~(),]|^|$)\\s*/g;7 I=/([\\s>+~,]|[^(]\\+|^)([#.:@])/g;7 18=6(s){5 s.O(W,"$1").O(I,"$1*$2")};7 1u={1Z:6(){5"\'"},P:/^(\'[^\']*\')|("[^"]*")$/,l:6(s){5 o.P.l(s)},1S:6(s){5 o.l(s)?s:o+s+o},1Y:6(s){5 o.l(s)?s.Z(1,-1):s}};7 1s=6(t){5 1u.1Y(t)};7 E=/([\\/()[\\]?{}|*+-])/g;6 R(s){5 s.O(E,"\\\\$1")};x.15("1j-2H",6(){D[">"]=6(r,f,t,n){7 e,i,j;9(i=0;i<f.y;i++){7 s=1o(f[i]);9(j=0;(e=s[j]);j++)8(17(e,t,n))r.z(e)}};D["+"]=6(r,f,t,n){9(7 i=0;i<f.y;i++){7 e=G(f[i]);8(e&&17(e,t,n))r.z(e)}};D["@"]=6(r,f,a){7 t=T[a].l;7 e,i;9(i=0;(e=f[i]);i++)8(t(e))r.z(e)};h["2G-10"]=6(e){5!16(e)};h["1x"]=6(e,c){c=12 1t("^"+c,"i");H(e&&!e.13("1x"))e=e.1n;5 e&&c.l(e.13("1x"))};q.1X=/\\\\:/g;q.1w="@";q.J={};q.O=6(m,a,n,c,v){7 k=o.1w+m;8(!T[k]){a=o.1W(a,c||"",v||"");T[k]=a;T.z(a)}5 T[k].B};q.1Q=6(s){s=s.O(o.1X,"|");7 m;H(m=s.P(o.P)){7 r=o.O(m[0],m[1],m[2],m[3],m[4]);s=s.O(o.P,r)}5 s};q.1W=6(p,t,v){7 a={};a.B=o.1w+T.y;a.2F=p;t=o.J[t];t=t?t(o.13(p),1s(v)):L;a.l=12 2E("e","5 "+t);5 a};q.13=6(n){1d(n.2D()){F"B":5"e.B";F"2C":5"e.1V";F"9":5"e.2B";F"1T":8(U){5"1U((e.2A.P(/1T=\\\\1v?([^\\\\s\\\\1v]*)\\\\1v?/)||[])[1]||\'\')"}}5"e.13(\'"+n.O(N,":")+"\')"};q.J[""]=6(a){5 a};q.J["="]=6(a,v){5 a+"=="+1u.1S(v)};q.J["~="]=6(a,v){5"/(^| )"+R(v)+"( |$)/.l("+a+")"};q.J["|="]=6(a,v){5"/^"+R(v)+"(-|$)/.l("+a+")"};7 1R=18;18=6(s){5 1R(q.1Q(s))}});x.15("1j-2z",6(){D["~"]=6(r,f,t,n){7 e,i;9(i=0;(e=f[i]);i++){H(e=G(e)){8(17(e,t,n))r.z(e)}}};h["2y"]=6(e,t){t=12 1t(R(1s(t)));5 t.l(1e(e))};h["2x"]=6(e){5 e==Q(e).1H};h["2w"]=6(e){7 n,i;9(i=0;(n=e.1F[i]);i++){8(M(n)||n.1c==3)5 L}5 K};h["1N-10"]=6(e){5!G(e)};h["2v-10"]=6(e){e=e.1n;5 1r(e)==1P(e)};h["2u"]=6(e,s){7 n=x(s,Q(e));9(7 i=0;i<n.y;i++){8(n[i]==e)5 L}5 K};h["1O-10"]=6(e,a){5 1p(e,a,16)};h["1O-1N-10"]=6(e,a){5 1p(e,a,G)};h["2t"]=6(e){5 e.B==2s.2r.Z(1)};h["1M"]=6(e){5 e.1M};h["2q"]=6(e){5 e.1q===L};h["1q"]=6(e){5 e.1q};h["1L"]=6(e){5 e.1L};q.J["^="]=6(a,v){5"/^"+R(v)+"/.l("+a+")"};q.J["$="]=6(a,v){5"/"+R(v)+"$/.l("+a+")"};q.J["*="]=6(a,v){5"/"+R(v)+"/.l("+a+")"};6 1p(e,a,t){1d(a){F"n":5 K;F"2p":a="2n";1a;F"2o":a="2n+1"}7 1m=1o(e.1n);6 1k(i){7 i=(t==G)?1m.y-i:i-1;5 1m[i]==e};8(!Y(a))5 1k(a);a=a.1l("n");7 m=1K(a[0]);7 s=1K(a[1]);8((Y(m)||m==1)&&s==0)5 K;8(m==0&&!Y(s))5 1k(s);8(Y(s))s=0;7 c=1;H(e=t(e))c++;8(Y(m)||m==1)5(t==G)?(c<=s):(s>=c);5(c%m)==s}});x.15("1j-2m",6(){U=1i("L;/*@2l@8(@\\2k)U=K@2j@*/");8(!U){X=6(e,t,n){5 n?e.2i("*",t):e.X(t)};14=6(e,n){5!n||(n=="*")||(e.2h==n)};1h=1g.1I?6(e){5/1J/i.l(Q(e).1I)}:6(e){5 Q(e).1H.1f!="2g"};1e=6(e){5 e.2f||e.1G||1b(e)};6 1b(e){7 t="",n,i;9(i=0;(n=e.1F[i]);i++){1d(n.1c){F 11:F 1:t+=1b(n);1a;F 3:t+=n.2e;1a}}5 t}}});19=K;5 x}();',62,190,'|||||return|function|var|if|for||||||||pseudoClasses||||test|||this||AttributeSelector|||||||cssQuery|length|push|fr|id||selectors||case|nextElementSibling|while||tests|true|false|thisElement||replace|match|getDocument|regEscape||attributeSelectors|isMSIE|cache||getElementsByTagName|isNaN|slice|child||new|getAttribute|compareNamespace|addModule|previousElementSibling|compareTagName|parseSelector|loaded|break|_0|nodeType|switch|getTextContent|tagName|document|isXML|eval|css|_1|split|ch|parentNode|childElements|nthChild|disabled|firstElementChild|getText|RegExp|Quote|x22|PREFIX|lang|_2|arguments|else|all|links|version|se|childNodes|innerText|documentElement|contentType|xml|parseInt|indeterminate|checked|last|nth|lastElementChild|parse|_3|add|href|String|className|create|NS_IE|remove|toString|ST|select|Array|null|_4|mimeType|lastChild|firstChild|continue|modules|delete|join|caching|error|nodeValue|textContent|HTML|prefix|getElementsByTagNameNS|end|x5fwin32|cc_on|standard||odd|even|enabled|hash|location|target|not|only|empty|root|contains|level3|outerHTML|htmlFor|class|toLowerCase|Function|name|first|level2|prototype|item|scopeName|toUpperCase|ownerDocument|Document|XML|Boolean|URL|unknown|typeof|nextSibling|previousSibling|visited|link|valueOf|clearCache|catch|concat|constructor|callee|try'.split('|'),0,{}))
