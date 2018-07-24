"use strict";!function(){function e(e){return new Promise(function(t,n){e.onsuccess=function(){t(e.result)},e.onerror=function(){n(e.error)}})}function t(t,n,o){var r,i=new Promise(function(i,u){e(r=t[n].apply(t,o)).then(i,u)});return i.request=r,i}function n(e,t,n){n.forEach(function(n){Object.defineProperty(e.prototype,n,{get:function(){return this[t][n]},set:function(e){this[t][n]=e}})})}function o(e,n,o,r){r.forEach(function(r){r in o.prototype&&(e.prototype[r]=function(){return t(this[n],r,arguments)})})}function r(e,t,n,o){o.forEach(function(o){o in n.prototype&&(e.prototype[o]=function(){return this[t][o].apply(this[t],arguments)})})}function i(e,n,o,r){r.forEach(function(r){r in o.prototype&&(e.prototype[r]=function(){return e=this[n],(o=t(e,r,arguments)).then(function(e){if(e)return new c(e,o.request)});var e,o})})}function u(e){this._index=e}function c(e,t){this._cursor=e,this._request=t}function s(e){this._store=e}function a(e){this._tx=e,this.complete=new Promise(function(t,n){e.oncomplete=function(){t()},e.onerror=function(){n(e.error)},e.onabort=function(){n(e.error)}})}function p(e,t,n){this._db=e,this.oldVersion=t,this.transaction=new a(n)}function f(e){this._db=e}n(u,"_index",["name","keyPath","multiEntry","unique"]),o(u,"_index",IDBIndex,["get","getKey","getAll","getAllKeys","count"]),i(u,"_index",IDBIndex,["openCursor","openKeyCursor"]),n(c,"_cursor",["direction","key","primaryKey","value"]),o(c,"_cursor",IDBCursor,["update","delete"]),["advance","continue","continuePrimaryKey"].forEach(function(t){t in IDBCursor.prototype&&(c.prototype[t]=function(){var n=this,o=arguments;return Promise.resolve().then(function(){return n._cursor[t].apply(n._cursor,o),e(n._request).then(function(e){if(e)return new c(e,n._request)})})})}),s.prototype.createIndex=function(){return new u(this._store.createIndex.apply(this._store,arguments))},s.prototype.index=function(){return new u(this._store.index.apply(this._store,arguments))},n(s,"_store",["name","keyPath","indexNames","autoIncrement"]),o(s,"_store",IDBObjectStore,["put","add","delete","clear","get","getAll","getKey","getAllKeys","count"]),i(s,"_store",IDBObjectStore,["openCursor","openKeyCursor"]),r(s,"_store",IDBObjectStore,["deleteIndex"]),a.prototype.objectStore=function(){return new s(this._tx.objectStore.apply(this._tx,arguments))},n(a,"_tx",["objectStoreNames","mode"]),r(a,"_tx",IDBTransaction,["abort"]),p.prototype.createObjectStore=function(){return new s(this._db.createObjectStore.apply(this._db,arguments))},n(p,"_db",["name","version","objectStoreNames"]),r(p,"_db",IDBDatabase,["deleteObjectStore","close"]),f.prototype.transaction=function(){return new a(this._db.transaction.apply(this._db,arguments))},n(f,"_db",["name","version","objectStoreNames"]),r(f,"_db",IDBDatabase,["close"]),["openCursor","openKeyCursor"].forEach(function(e){[s,u].forEach(function(t){t.prototype[e.replace("open","iterate")]=function(){var t,n=(t=arguments,Array.prototype.slice.call(t)),o=n[n.length-1],r=this._store||this._index,i=r[e].apply(r,n.slice(0,-1));i.onsuccess=function(){o(i.result)}}})}),[u,s].forEach(function(e){e.prototype.getAll||(e.prototype.getAll=function(e,t){var n=this,o=[];return new Promise(function(r){n.iterateCursor(e,function(e){e?(o.push(e.value),void 0===t||o.length!=t?e.continue():r(o)):r(o)})})})});var d={open:function(e,n,o){var r=t(indexedDB,"open",[e,n]),i=r.request;return i.onupgradeneeded=function(e){o&&o(new p(i.result,e.oldVersion,i.transaction))},r.then(function(e){return new f(e)})},delete:function(e){return t(indexedDB,"deleteDatabase",[e])}};"undefined"!=typeof module?(module.exports=d,module.exports.default=module.exports):self.idb=d}();
class DBHelper{static get DB_NAME(){return"restaurants-db"}static get RESTAURANTS_OBJECT_STORE(){return"restaurants"}static get REVIEWS_OBJECT_STORE(){return"reviews"}static openDB(){return idb.open(DBHelper.DB_NAME,4,e=>{e.objectStoreNames.contains(DBHelper.RESTAURANTS_OBJECT_STORE)||e.createObjectStore(DBHelper.RESTAURANTS_OBJECT_STORE,{keyPath:"id"})})}static get RESTAURANTS_URL(){return"http://localhost:1337/restaurants"}static get REVIEWS_URL(){return"http://localhost:1337/reviews/"}static async fetchRestaurants(e){try{const t=(await DBHelper.openDB()).transaction(DBHelper.RESTAURANTS_OBJECT_STORE,"readwrite").objectStore(DBHelper.RESTAURANTS_OBJECT_STORE);let a=await t.getAll();if(10===a.length)return console.log("we already stored on DB"),void e(null,a);e(null,a=await DBHelper.fetchRestaurantsFromNetwork()),await DBHelper.saveRestaurantsOnDB(a)}catch(t){e(t,null)}}static async fetchRestaurantsFromNetwork(){try{const e=await window.fetch(DBHelper.RESTAURANTS_URL);return e.ok?e.json():Promise.reject(`error returned with ${e.status} status code`)}catch(e){return Promise.reject(e)}}static async saveRestaurantsOnDB(e){const t=(await DBHelper.openDB()).transaction(DBHelper.RESTAURANTS_OBJECT_STORE,"readwrite").objectStore(DBHelper.RESTAURANTS_OBJECT_STORE);return e.forEach(async e=>{await t.get(e.id)||await t.add(e)})}static async fetchRestaurantById(e,t){let a;try{const r=(await DBHelper.openDB()).transaction(DBHelper.RESTAURANTS_OBJECT_STORE).objectStore(DBHelper.RESTAURANTS_OBJECT_STORE);let s=await r.get(parseInt(e));if(s)return console.log("I am exist on DB"),s.reviews?(console.log("reviews exist ",s.reviews),void t(null,s)):((a=await DBHelper.getRestaurantReviews(e))&&(s.reviews=a,await DBHelper.updateRestaurantInDB(s)),void t(null,s));s=await DBHelper.fetchRestaurantFromNetwork(e),a=await DBHelper.getRestaurantReviews(e),s.reviews=a,t(null,s)}catch(e){t(e,null)}}static async fetchRestaurantFromNetwork(e){try{const t=(await DBHelper.openDB()).transaction(DBHelper.RESTAURANTS_OBJECT_STORE,"readwrite").objectStore(DBHelper.RESTAURANTS_OBJECT_STORE),a=await fetch(`${DBHelper.RESTAURANTS_URL}/${e}`);return a.ok?(t.add(a.json()),a.json()):Promise.reject(`error returned with status ${a.status}`)}catch(e){return Promise.reject(e)}}static fetchRestaurantByCuisine(e,t){DBHelper.fetchRestaurants((a,r)=>{if(a)t(a,null);else{const a=r.filter(t=>t.cuisine_type==e);t(null,a)}})}static fetchRestaurantByNeighborhood(e,t){DBHelper.fetchRestaurants((a,r)=>{if(a)t(a,null);else{const a=r.filter(t=>t.neighborhood==e);t(null,a)}})}static fetchRestaurantByCuisineAndNeighborhood(e,t,a){DBHelper.fetchRestaurants((r,s)=>{if(r)a(r,null);else{let r=s;"all"!=e&&(r=r.filter(t=>t.cuisine_type==e)),"all"!=t&&(r=r.filter(e=>e.neighborhood==t)),a(null,r)}})}static fetchNeighborhoods(e){DBHelper.fetchRestaurants((t,a)=>{if(t)e(t,null);else{const t=a.map((e,t)=>a[t].neighborhood),r=t.filter((e,a)=>t.indexOf(e)==a);e(null,r)}})}static fetchCuisines(e){DBHelper.fetchRestaurants((t,a)=>{if(t)e(t,null);else{const t=a.map((e,t)=>a[t].cuisine_type),r=t.filter((e,a)=>t.indexOf(e)==a);e(null,r)}})}static urlForRestaurant(e){return`./restaurant.html?id=${e.id}`}static imageUrlForRestaurant(e){return window.location.pathname.includes("restaurant.html")?`/img/${e.id}.jpg`:`/img/smallimg/${e.id}.jpg`}static mapMarkerForRestaurant(e,t){return new google.maps.Marker({position:e.latlng,title:e.name,url:DBHelper.urlForRestaurant(e),map:t,animation:google.maps.Animation.DROP})}static async changeRestaurantFavorite(e,t){const{is_favorite:a,id:r}=e,s="false"===a?"true":"false";e.is_favorite=s,await DBHelper.updateRestaurantInDB(e),fetch(`http://localhost:1337/restaurants/${r}\n        /?is_favorite=${s}`,{method:"PUT"}).then(e=>e.json()).then(e=>t(null,e.is_favorite)).catch(e=>t(e))}static formatDate(e){return new Date(e).toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",seconds:"2-digit"})}static async addNewRestaurantReview(e,t,a){if(navigator.onLine)try{await fetch("http://localhost:1337/reviews",{method:"POST",body:JSON.stringify({restaurant_id:e.id,...t})}).then(e=>e.json()).then(t=>{e.reviews=[...e.reviews,t],console.log(e.reviews),a(null,"data saved to the server successfully ")}),await DBHelper.updateRestaurantInDB(e)}catch(e){a(e,null)}else try{e.reviews=[...e.reviews,{restaurant_id:e.id,...t}],await DBHelper.updateRestaurantInDB(e),a(null,"You are offline review saved locally when you're online data will sent to server")}catch(e){a(e,null)}}static async getRestaurantReviews(e){try{let t=await fetch(`${DBHelper.REVIEWS_URL}?restaurant_id=${e}`);return t.ok?t.json():null}catch(e){return null}}static async updateRestaurantInDB(e){console.log("id is ",e.id),console.log("id is ",e.id);try{const t=(await DBHelper.openDB()).transaction(DBHelper.RESTAURANTS_OBJECT_STORE,"readwrite").objectStore(DBHelper.RESTAURANTS_OBJECT_STORE);return await t.put(e),console.log(e),"success"}catch(e){console.error(e)}}static async updateServerAndDB(e){const t=[];if(e)try{return e.reviews.forEach(async e=>{e.id?t.push(e):(console.log("I am here "),await fetch(`${DBHelper.REVIEWS_URL}`,{method:"POST",body:JSON.stringify({...e})}).then(e=>e.json()).then(e=>{console.log(e),t.push(e)}).catch(e=>console.log(e)),console.log("I am here 2"))}),e.reviews=t,console.log(t),await DBHelper.updateRestaurantInDB(e),Promise.resolve("done")}catch(e){return Promise.reject(e)}}}
let restaurant,map;document.addEventListener("DOMContentLoaded",()=>{const e=document.getElementById("show_map");e.addEventListener("click",()=>{document.getElementById("map").style.display="block",e.style.display="none"})}),window.initMap=(()=>{fetchRestaurantFromURL((e,t)=>{e?console.error(e):(self.map=new google.maps.Map(document.getElementById("map"),{zoom:16,center:t.latlng,scrollwheel:!1}),fillBreadcrumb(),DBHelper.mapMarkerForRestaurant(self.restaurant,self.map))})});const fetchRestaurantFromURL=e=>{if(self.restaurant)return void e(null,self.restaurant);const t=getParameterByName("id");t?DBHelper.fetchRestaurantById(t,(t,n)=>{self.restaurant=n,n?(fillRestaurantHTML(),e(null,n)):console.error(t)}):(error="No restaurant id in URL",e(error,null))},fillRestaurantHTML=(e=self.restaurant)=>{document.getElementById("restaurant-name").innerHTML=e.name,document.getElementById("restaurant-address").innerHTML=e.address;const t=document.getElementById("restaurant-img");t.className="restaurant-img",t.alt=`${e.name} restaurant, address ${e.address}, ${e.cuisine_type} cuisine`,t.src=DBHelper.imageUrlForRestaurant(e),document.getElementById("restaurant-cuisine").innerHTML=e.cuisine_type,e.operating_hours&&fillRestaurantHoursHTML(),fillReviewsHTML()},fillRestaurantHoursHTML=(e=self.restaurant.operating_hours)=>{const t=document.getElementById("restaurant-hours");for(let n in e){const r=document.createElement("tr"),a=document.createElement("td");a.innerHTML=n,r.appendChild(a);const d=document.createElement("td");d.innerHTML=e[n],r.appendChild(d),t.appendChild(r)}},fillReviewsHTML=(e=self.restaurant.reviews)=>{const t=document.getElementById("reviews-container"),n=document.createElement("h3");if(n.innerHTML="Reviews",t.appendChild(n),!e){const e=document.createElement("p");return e.innerHTML="No reviews yet!",void t.appendChild(e)}const r=document.getElementById("reviews-list");e.forEach(e=>{r.appendChild(createReviewHTML(e))}),t.appendChild(r)},updateReviewsHTML=(e=self.restaurant.reviews)=>{const t=document.getElementById("reviews-list");e.forEach(e=>{t.appendChild(createReviewHTML(e))})},createReviewHTML=e=>{const t=document.createElement("li"),n=document.createElement("p");n.innerHTML=e.name,t.appendChild(n);const r=document.createElement("p");r.innerHTML=`Rating: ${e.rating}`,t.appendChild(r);const a=document.createElement("p");return a.innerHTML=e.comments,t.appendChild(a),t},fillBreadcrumb=(e=self.restaurant)=>{const t=document.getElementById("breadcrumb"),n=document.createElement("li"),r=document.createElement("a");r.href=`restaurant.html?id=${e.id}`,r.innerHTML=e.name,r.setAttribute("aria-current","page"),n.appendChild(r),t.appendChild(n)},getParameterByName=(e,t)=>{t||(t=window.location.href),e=e.replace(/[\[\]]/g,"\\$&");const n=new RegExp(`[?&]${e}(=([^&#]*)|&|#|$)`).exec(t);return n?n[2]?decodeURIComponent(n[2].replace(/\+/g," ")):"":null},addReviewButton=document.getElementById("add_review");addReviewButton.addEventListener("click",function(){let e=document.getElementById("user_name").value,t=document.getElementById("rating").value,n=document.getElementById("user_comment").value;if(!e.trim()||!t||!n.trim())return void alert("please add correct values then submit again");if(parseInt(t)>5||parseInt(t)<0)return void alert("rating value show be from 0 to 5");const r={name:e,rating:t,comments:n};DBHelper.addNewRestaurantReview(self.restaurant,r,(e,t)=>{e?console.error("error updating the server data"):(console.log("updating the data successfully"),updateReviewsHTML())})}),window.addEventListener("online",()=>{DBHelper.updateServerAndDB(self.restaurant).then(()=>{console.log("done")}).catch(e=>{console.error(e)})});