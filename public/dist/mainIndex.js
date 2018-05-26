/**
 * Common database helper functions.
 */
class DBHelper {
    /**
     * Database URL.
     * Change this to restaurants.json file location on your server.
     */
    static get DB_NAME() {
        return 'restaurants-db';
    }
    static get RESTAURANTS_OBJECT_STORE() {
        return 'restaurants';
    }
    static get REVIEWS_OBJECT_STORE() {
        return 'reviews';
    }
    static openDB() {
        // open DB
        return idb.open(DBHelper.DB_NAME, 4, upgradedDB => {
            // create restaurants store
            if (
                !upgradedDB.objectStoreNames.contains(
                    DBHelper.RESTAURANTS_OBJECT_STORE,
                )
            ) {
                upgradedDB.createObjectStore(
                    DBHelper.RESTAURANTS_OBJECT_STORE,
                    {
                        keyPath: 'id',
                    },
                );
            }
        });
    }
    static get RESTAURANTS_URL() {
        // new url for the data
        return `http://localhost:1337/restaurants`;
    }
    // reviews url
    static get REVIEWS_URL() {
        return 'http://localhost:1337/reviews/';
    }
    /**
     * Fetch all restaurants.
     */
    static async fetchRestaurants(callback) {
        //fetching the data with fetch API
        try {
            const my_db = await DBHelper.openDB();

            const restaurantsTx = my_db.transaction(
                DBHelper.RESTAURANTS_OBJECT_STORE,
                'readwrite',
            );
            const restaurantsStore = restaurantsTx.objectStore(
                DBHelper.RESTAURANTS_OBJECT_STORE,
            );

            let restaurants = await restaurantsStore.getAll();

            // if all restaurants exist
            if (restaurants.length === 10) {
                console.log('we already stored on DB');
                callback(null, restaurants);
                return;
            }
            restaurants = await DBHelper.fetchRestaurantsFromNetwork();
            callback(null, restaurants);
            await DBHelper.saveRestaurantsOnDB(restaurants);
        } catch (e) {
            callback(e, null);
        }
    }
    // fetch restaurants data from network
    static async fetchRestaurantsFromNetwork() {
        try {
            const response = await window.fetch(DBHelper.RESTAURANTS_URL);
            if (response.ok) return response.json();
            // response may occur but with the wrong status code
            // that wan't reject the promise
            return Promise.reject(
                `error returned with ${response.status} status code`,
            );
        } catch (e) {
            // if any error happen while fetching
            // like internet connectivity or not valid url
            // reject error
            return Promise.reject(e);
        }
    }

    /**
     *
     * @param restaurants  array of all restaurants to store in DB
     */
    static async saveRestaurantsOnDB(restaurants) {
        const my_db = await DBHelper.openDB();
        const tx = my_db.transaction(
            DBHelper.RESTAURANTS_OBJECT_STORE,
            'readwrite',
        );
        const store = tx.objectStore(DBHelper.RESTAURANTS_OBJECT_STORE);
        return restaurants.forEach(async restaurant => {
            // check if values already exist
            const value = await store.get(restaurant.id);
            if (value) return;
            await store.add(restaurant);
        });
    }

    /**
     * Fetch a restaurant by its ID.
     */
    static async fetchRestaurantById(id, callback) {
        // fetch all restaurants with proper error handling.
        let restaurant, reviews;
        try {
            // get the restaurant from db first
            const my_db = await DBHelper.openDB();
            const tx = my_db.transaction(DBHelper.RESTAURANTS_OBJECT_STORE);
            const restaurantsStore = tx.objectStore(
                DBHelper.RESTAURANTS_OBJECT_STORE,
            );
            let restaurant = await restaurantsStore.get(parseInt(id));
            // if it exist
            if (restaurant) {
                console.log('I am exist on DB');
                // get restaurants reviews
                // check if it has reviews
                if (restaurant.reviews) {
                    console.log(`reviews exist `, restaurant.reviews);
                    callback(null, restaurant);
                    return;
                }
                // else we get it from the network
                reviews = await DBHelper.getRestaurantReviews(id);
                if (reviews) {
                    // update restaurant in the db
                    restaurant.reviews = reviews;
                    await DBHelper.updateRestaurantInDB(restaurant);
                }
                callback(null, restaurant);
                return;
            }
            // get restaurant and reviews
            restaurant = await DBHelper.fetchRestaurantFromNetwork(id);
            reviews = await DBHelper.getRestaurantReviews(id);
            restaurant.reviews = reviews;

            callback(null, restaurant);
        } catch (e) {
            callback(e, null);
        }
    }
    // fetch restaurant with specified Id form network
    static async fetchRestaurantFromNetwork(id) {
        try {
            const my_db = await DBHelper.openDB();
            const tx = my_db.transaction(
                DBHelper.RESTAURANTS_OBJECT_STORE,
                'readwrite',
            );
            const store = tx.objectStore(DBHelper.RESTAURANTS_OBJECT_STORE);
            const response = await fetch(`${DBHelper.RESTAURANTS_URL}/${id}`);
            // if the response is success
            if (response.ok) {
                store.add(response.json());
                return response.json();
            }
            return Promise.reject(
                `error returned with status ${response.status}`,
            );
        } catch (e) {
            return Promise.reject(e);
        }
    }
    /**
     * Fetch restaurants by a cuisine type with proper error handling.
     */
    static fetchRestaurantByCuisine(cuisine, callback) {
        // Fetch all restaurants  with proper error handling
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Filter restaurants to have only given cuisine type
                const results = restaurants.filter(
                    r => r.cuisine_type == cuisine,
                );
                callback(null, results);
            }
        });
    }

    /**
     * Fetch restaurants by a neighborhood with proper error handling.
     */
    static fetchRestaurantByNeighborhood(neighborhood, callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Filter restaurants to have only given neighborhood
                const results = restaurants.filter(
                    r => r.neighborhood == neighborhood,
                );
                callback(null, results);
            }
        });
    }

    /**
     * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
     */
    static fetchRestaurantByCuisineAndNeighborhood(
        cuisine,
        neighborhood,
        callback,
    ) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                let results = restaurants;
                if (cuisine != 'all') {
                    // filter by cuisine
                    results = results.filter(r => r.cuisine_type == cuisine);
                }
                if (neighborhood != 'all') {
                    // filter by neighborhood
                    results = results.filter(
                        r => r.neighborhood == neighborhood,
                    );
                }
                callback(null, results);
            }
        });
    }

    /**
     * Fetch all neighborhoods with proper error handling.
     */
    static fetchNeighborhoods(callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Get all neighborhoods from all restaurants
                const neighborhoods = restaurants.map(
                    (v, i) => restaurants[i].neighborhood,
                );
                // Remove duplicates from neighborhoods
                const uniqueNeighborhoods = neighborhoods.filter(
                    (v, i) => neighborhoods.indexOf(v) == i,
                );
                callback(null, uniqueNeighborhoods);
            }
        });
    }

    /**
     * Fetch all cuisines with proper error handling.
     */
    static fetchCuisines(callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Get all cuisines from all restaurants
                const cuisines = restaurants.map(
                    (v, i) => restaurants[i].cuisine_type,
                );
                // Remove duplicates from cuisines
                const uniqueCuisines = cuisines.filter(
                    (v, i) => cuisines.indexOf(v) == i,
                );
                callback(null, uniqueCuisines);
            }
        });
    }

    /**
     * Restaurant page URL.
     */
    static urlForRestaurant(restaurant) {
        return `./restaurant.html?id=${restaurant.id}`;
    }

    /**
     * Restaurant image URL.
     */
    static imageUrlForRestaurant(restaurant) {
        // return the optimized images for the current page
        return window.location.pathname.includes('restaurant.html')
            ? `/img/${restaurant.id}.jpg`
            : `/img/smallimg/${restaurant.id}.jpg`;
    }

    /**
     * Map marker for a restaurant.
     */
    static mapMarkerForRestaurant(restaurant, map) {
        const marker = new google.maps.Marker({
            position: restaurant.latlng,
            title: restaurant.name,
            url: DBHelper.urlForRestaurant(restaurant),
            map: map,
            animation: google.maps.Animation.DROP,
        });
        return marker;
    }

    /**
     * Change restaurant is_favorite prop to its opposite value
     *
     * @param restaurant the restaurant to change its favorite state
     * @param cb callback to run after request
     */
    static async changeRestaurantFavorite(restaurant, cb) {
        const { is_favorite, id } = restaurant;
        const newIsFavorite = is_favorite === 'false' ? 'true' : 'false';
        restaurant.is_favorite = newIsFavorite;
        await DBHelper.updateRestaurantInDB(restaurant);
        fetch(
            `http://localhost:1337/restaurants/${id}
        /?is_favorite=${newIsFavorite}`,
            { method: 'PUT' },
        )
            .then(res => res.json())
            // if it works pass the new is_favorite to callback
            .then(rest => cb(null, rest.is_favorite))
            // if any error happen pass to the callback
            .catch(err => cb(err));
    }

    /**
     * format Date to look nicer
     * @param date in milliseconds
     * @returns {string} the formatted Date
     */
    static formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            seconds: '2-digit',
        });
    }
    static async addNewRestaurantReview(restaurant, review, cb) {
        // if user is offline just save the new review on DB
        if (!navigator.onLine) {
            // save restaurant onDB with the new review
            try {
                restaurant.reviews = [
                    ...restaurant.reviews,
                    { restaurant_id: restaurant.id, ...review },
                ];
                await DBHelper.updateRestaurantInDB(restaurant);
                cb(
                    null,
                    "You are offline review saved locally when you're online data will sent to server",
                );
            } catch (e) {
                cb(e, null);
            }
        } else {
            // update the server api and the DB as well
            try {
                await fetch('http://localhost:1337/reviews', {
                    method: 'POST',
                    body: JSON.stringify({
                        restaurant_id: restaurant.id,
                        ...review,
                    }),
                })
                    .then(res => res.json())
                    .then(newReview => {
                        restaurant.reviews = [...restaurant.reviews, newReview];
                        console.log(restaurant.reviews);
                        cb(null, 'data saved to the server successfully ');
                    });
                await DBHelper.updateRestaurantInDB(restaurant);
            } catch (e) {
                cb(e, null);
            }
        }
    }

    static async getRestaurantReviews(id) {
        try {
            let response = await fetch(
                `${DBHelper.REVIEWS_URL}?restaurant_id=${id}`,
            );
            if (response.ok) {
                return response.json();
            } else {
                return null;
            }
        } catch (e) {
            return null;
        }
    }

    static async updateRestaurantInDB(restaurant) {
        console.log('id is ', restaurant.id);
        console.log('id is ', restaurant.id);
        try {
            const my_db = await DBHelper.openDB();
            const tx = my_db.transaction(
                DBHelper.RESTAURANTS_OBJECT_STORE,
                'readwrite',
            );
            const restaurantsStore = tx.objectStore(
                DBHelper.RESTAURANTS_OBJECT_STORE,
            );
            await restaurantsStore.put(restaurant);
            console.log(restaurant);
            return 'success';
        } catch (e) {
            console.error(e);
        }
    }
    static async updateServerAndDB(restaurant) {
        const newReviews = [];
        if (restaurant) {
           try{
               restaurant.reviews.forEach(async review => {
                   // if review is already on the server just push it
                   if (review.id) newReviews.push(review);
                   // else fetch  it to the server and update it on DB
                   else {
                       console.log('I am here ') ;
                       await fetch(`${DBHelper.REVIEWS_URL}`, {
                           method: 'POST',
                           body: JSON.stringify({ ...review }),
                       })
                           .then(res => res.json())
                           .then(resReview => {
                               console.log(resReview);
                               newReviews.push(resReview) ;
                           })
                           .catch(err => console.log(err));
                       console.log('I am here 2') ;
                   }
               });
               restaurant.reviews = newReviews;
               console.log(newReviews);
               await DBHelper.updateRestaurantInDB(restaurant);
               return Promise.resolve('done');
           }
           catch (e) {
               return Promise.reject(e);
           }
        }
    }
}

'use strict';

(function() {
    function toArray(arr) {
        return Array.prototype.slice.call(arr);
    }

    function promisifyRequest(request) {
        return new Promise(function(resolve, reject) {
            request.onsuccess = function() {
                resolve(request.result);
            };

            request.onerror = function() {
                reject(request.error);
            };
        });
    }

    function promisifyRequestCall(obj, method, args) {
        var request;
        var p = new Promise(function(resolve, reject) {
            request = obj[method].apply(obj, args);
            promisifyRequest(request).then(resolve, reject);
        });

        p.request = request;
        return p;
    }

    function promisifyCursorRequestCall(obj, method, args) {
        var p = promisifyRequestCall(obj, method, args);
        return p.then(function(value) {
            if (!value) return;
            return new Cursor(value, p.request);
        });
    }

    function proxyProperties(ProxyClass, targetProp, properties) {
        properties.forEach(function(prop) {
            Object.defineProperty(ProxyClass.prototype, prop, {
                get: function() {
                    return this[targetProp][prop];
                },
                set: function(val) {
                    this[targetProp][prop] = val;
                }
            });
        });
    }

    function proxyRequestMethods(ProxyClass, targetProp, Constructor, properties) {
        properties.forEach(function(prop) {
            if (!(prop in Constructor.prototype)) return;
            ProxyClass.prototype[prop] = function() {
                return promisifyRequestCall(this[targetProp], prop, arguments);
            };
        });
    }

    function proxyMethods(ProxyClass, targetProp, Constructor, properties) {
        properties.forEach(function(prop) {
            if (!(prop in Constructor.prototype)) return;
            ProxyClass.prototype[prop] = function() {
                return this[targetProp][prop].apply(this[targetProp], arguments);
            };
        });
    }

    function proxyCursorRequestMethods(ProxyClass, targetProp, Constructor, properties) {
        properties.forEach(function(prop) {
            if (!(prop in Constructor.prototype)) return;
            ProxyClass.prototype[prop] = function() {
                return promisifyCursorRequestCall(this[targetProp], prop, arguments);
            };
        });
    }

    function Index(index) {
        this._index = index;
    }

    proxyProperties(Index, '_index', [
        'name',
        'keyPath',
        'multiEntry',
        'unique'
    ]);

    proxyRequestMethods(Index, '_index', IDBIndex, [
        'get',
        'getKey',
        'getAll',
        'getAllKeys',
        'count'
    ]);

    proxyCursorRequestMethods(Index, '_index', IDBIndex, [
        'openCursor',
        'openKeyCursor'
    ]);

    function Cursor(cursor, request) {
        this._cursor = cursor;
        this._request = request;
    }

    proxyProperties(Cursor, '_cursor', [
        'direction',
        'key',
        'primaryKey',
        'value'
    ]);

    proxyRequestMethods(Cursor, '_cursor', IDBCursor, [
        'update',
        'delete'
    ]);

    // proxy 'next' methods
    ['advance', 'continue', 'continuePrimaryKey'].forEach(function(methodName) {
        if (!(methodName in IDBCursor.prototype)) return;
        Cursor.prototype[methodName] = function() {
            var cursor = this;
            var args = arguments;
            return Promise.resolve().then(function() {
                cursor._cursor[methodName].apply(cursor._cursor, args);
                return promisifyRequest(cursor._request).then(function(value) {
                    if (!value) return;
                    return new Cursor(value, cursor._request);
                });
            });
        };
    });

    function ObjectStore(store) {
        this._store = store;
    }

    ObjectStore.prototype.createIndex = function() {
        return new Index(this._store.createIndex.apply(this._store, arguments));
    };

    ObjectStore.prototype.index = function() {
        return new Index(this._store.index.apply(this._store, arguments));
    };

    proxyProperties(ObjectStore, '_store', [
        'name',
        'keyPath',
        'indexNames',
        'autoIncrement'
    ]);

    proxyRequestMethods(ObjectStore, '_store', IDBObjectStore, [
        'put',
        'add',
        'delete',
        'clear',
        'get',
        'getAll',
        'getKey',
        'getAllKeys',
        'count'
    ]);

    proxyCursorRequestMethods(ObjectStore, '_store', IDBObjectStore, [
        'openCursor',
        'openKeyCursor'
    ]);

    proxyMethods(ObjectStore, '_store', IDBObjectStore, [
        'deleteIndex'
    ]);

    function Transaction(idbTransaction) {
        this._tx = idbTransaction;
        this.complete = new Promise(function(resolve, reject) {
            idbTransaction.oncomplete = function() {
                resolve();
            };
            idbTransaction.onerror = function() {
                reject(idbTransaction.error);
            };
            idbTransaction.onabort = function() {
                reject(idbTransaction.error);
            };
        });
    }

    Transaction.prototype.objectStore = function() {
        return new ObjectStore(this._tx.objectStore.apply(this._tx, arguments));
    };

    proxyProperties(Transaction, '_tx', [
        'objectStoreNames',
        'mode'
    ]);

    proxyMethods(Transaction, '_tx', IDBTransaction, [
        'abort'
    ]);

    function UpgradeDB(db, oldVersion, transaction) {
        this._db = db;
        this.oldVersion = oldVersion;
        this.transaction = new Transaction(transaction);
    }

    UpgradeDB.prototype.createObjectStore = function() {
        return new ObjectStore(this._db.createObjectStore.apply(this._db, arguments));
    };

    proxyProperties(UpgradeDB, '_db', [
        'name',
        'version',
        'objectStoreNames'
    ]);

    proxyMethods(UpgradeDB, '_db', IDBDatabase, [
        'deleteObjectStore',
        'close'
    ]);

    function DB(db) {
        this._db = db;
    }

    DB.prototype.transaction = function() {
        return new Transaction(this._db.transaction.apply(this._db, arguments));
    };

    proxyProperties(DB, '_db', [
        'name',
        'version',
        'objectStoreNames'
    ]);

    proxyMethods(DB, '_db', IDBDatabase, [
        'close'
    ]);

    // Add cursor iterators
    // TODO: remove this once browsers do the right thing with promises
    ['openCursor', 'openKeyCursor'].forEach(function(funcName) {
        [ObjectStore, Index].forEach(function(Constructor) {
            Constructor.prototype[funcName.replace('open', 'iterate')] = function() {
                var args = toArray(arguments);
                var callback = args[args.length - 1];
                var nativeObject = this._store || this._index;
                var request = nativeObject[funcName].apply(nativeObject, args.slice(0, -1));
                request.onsuccess = function() {
                    callback(request.result);
                };
            };
        });
    });

    // polyfill getAll
    [Index, ObjectStore].forEach(function(Constructor) {
        if (Constructor.prototype.getAll) return;
        Constructor.prototype.getAll = function(query, count) {
            var instance = this;
            var items = [];

            return new Promise(function(resolve) {
                instance.iterateCursor(query, function(cursor) {
                    if (!cursor) {
                        resolve(items);
                        return;
                    }
                    items.push(cursor.value);

                    if (count !== undefined && items.length == count) {
                        resolve(items);
                        return;
                    }
                    cursor.continue();
                });
            });
        };
    });

    var exp = {
        open: function(name, version, upgradeCallback) {
            var p = promisifyRequestCall(indexedDB, 'open', [name, version]);
            var request = p.request;

            request.onupgradeneeded = function(event) {
                if (upgradeCallback) {
                    upgradeCallback(new UpgradeDB(request.result, event.oldVersion, request.transaction));
                }
            };

            return p.then(function(db) {
                return new DB(db);
            });
        },
        delete: function(name) {
            return promisifyRequestCall(indexedDB, 'deleteDatabase', [name]);
        }
    };

    if (typeof module !== 'undefined') {
        module.exports = exp;
        module.exports.default = module.exports;
    }
    else {
        self.idb = exp;
    }
}());

let restaurants, neighborhoods, cuisines;
var map;
var markers = [];
let selectFavorite = false;
/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', event => {
    fetchNeighborhoods();
    fetchCuisines();
    registerServiceWorker();
    const frames = document.getElementsByTagName('iframe');
    console.log(frames[0]);

});
/*
    register service worker function
 */
const registerServiceWorker = () => {
     if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').then(reg => {
            console.log('successful register the service worker');
        });
    }
};
/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
    DBHelper.fetchNeighborhoods((error, neighborhoods) => {
        if (error) {
            // Got an error
            console.error(error);
        } else {
            self.neighborhoods = neighborhoods;
            fillNeighborhoodsHTML();
        }
    });
};

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
    const select = document.getElementById('neighborhoods-select');
    neighborhoods.forEach(neighborhood => {
        const option = document.createElement('option');
        option.innerHTML = neighborhood;
        option.value = neighborhood;
        select.append(option);
    });
};

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
    DBHelper.fetchCuisines((error, cuisines) => {
        if (error) {
            // Got an error!
            console.error(error);
        } else {
            self.cuisines = cuisines;
            fillCuisinesHTML();
        }
    });
};

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
    const select = document.getElementById('cuisines-select');

    cuisines.forEach(cuisine => {
        const option = document.createElement('option');
        option.innerHTML = cuisine;
        option.value = cuisine;
        select.append(option);
    });
};

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
    let loc = {
        lat: 40.722216,
        lng: -73.987501,
    };
    self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 12,
        center: loc,
        scrollwheel: false,
    });
    updateRestaurants();
};

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
    const cSelect = document.getElementById('cuisines-select');
    const nSelect = document.getElementById('neighborhoods-select');

    const cIndex = cSelect.selectedIndex;
    const nIndex = nSelect.selectedIndex;

    const cuisine = cSelect[cIndex].value;
    const neighborhood = nSelect[nIndex].value;

    DBHelper.fetchRestaurantByCuisineAndNeighborhood(
        cuisine,
        neighborhood,
        (error, restaurants) => {
            if (error) {
                // Got an error!
                console.error(error);
            } else {
                resetRestaurants(restaurants);
                fillRestaurantsHTML();
            }
        },
    );
};
/**
 * get all the favorite restaurants or return all restaurants
 */
const favoriteRestaurants = (restaurants = self.restaurants) => {
    if (restaurants && selectFavorite){
        console.log(`restaurants at favorits is `,restaurants);
        return restaurants.filter(res => res.is_favorite==='true');
    }
    if (restaurants) return restaurants;
    return [];
};
/**
 * change the current visible restaurants
 */
const toggleVisibleRestaurants = event => {
    const { selectedIndex } = event.target;
    if (selectedIndex === 1) {
        selectFavorite = true;
        console.log(selectFavorite);
        updateRestaurants()
    } else if (selectedIndex === 0) {
        selectFavorite = false;
        updateRestaurants();
    }
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = restaurants => {
    // Remove all restaurants
    self.restaurants = [];
    const ul = document.getElementById('restaurants-list');
    ul.innerHTML = '';

    // Remove all map markers
    self.markers.forEach(m => m.setMap(null));
    self.markers = [];
    self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = favoriteRestaurants(self.restaurants)) => {
    console.log(`updating`,restaurants);
    const ul = document.getElementById('restaurants-list');
    restaurants.forEach(restaurant => {
        ul.append(createRestaurantHTML(restaurant));
    });
    addMarkersToMap(restaurants);
};

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = restaurant => {
    const li = document.createElement('li');

    const image = document.createElement('img');
    image.className = 'restaurant-img';
    image.alt = `${restaurant.name} restaurant, address ${
        restaurant.address
    }, ${restaurant.cuisine_type} cuisine`;
    image.src = DBHelper.imageUrlForRestaurant(restaurant);
    li.append(image);

    const name = document.createElement('h3');
    name.innerHTML = restaurant.name;
    li.append(name);

    const neighborhood = document.createElement('p');
    neighborhood.innerHTML = restaurant.neighborhood;
    li.append(neighborhood);

    const address = document.createElement('p');
    address.innerHTML = restaurant.address;
    li.append(address);

    const more = document.createElement('a');
    more.innerHTML = 'View Details';
    more.href = DBHelper.urlForRestaurant(restaurant);
    li.append(more);
    // favorite icon to toggle favorite restaurant
    const favorite = document.createElement('p');
    favorite.classList.add('heart');
    // if this restaurant is user favorite restaurant mark it
    if (restaurant.is_favorite === 'true') {
        favorite.classList.add('active');
    }
    favorite.addEventListener('click', () => {
        // old favorite
        const { is_favorite: oldFavorite } = restaurant;
        // change is_favorite
        DBHelper.changeRestaurantFavorite(restaurant, (err, newIsFavorite) => {
            // do nothing
            if (oldFavorite !== newIsFavorite) {
                favorite.classList.toggle('active');
            }
        });
    });
    li.appendChild(favorite);
    return li;
};

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = favoriteRestaurants(self.restaurants)) => {
    restaurants.forEach(restaurant => {
        // Add marker to the map
        const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
        google.maps.event.addListener(marker, 'click', () => {
            window.location.href = marker.url;
        });
        self.markers.push(marker);
    });
};
