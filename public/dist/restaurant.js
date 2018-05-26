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

let restaurant;
var map;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
    fetchRestaurantFromURL((error, restaurant) => {
        if (error) {
            // Got an error!
            console.error(error);
        } else {
            self.map = new google.maps.Map(document.getElementById('map'), {
                zoom: 16,
                center: restaurant.latlng,
                scrollwheel: false,
            });
            fillBreadcrumb();
            DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
        }
    });
};

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = callback => {
    if (self.restaurant) {
        // restaurant already fetched!
        callback(null, self.restaurant);
        return;
    }
    const id = getParameterByName('id');
    if (!id) {
        // no id found in URL
        const error = 'No restaurant id in URL';
        callback(error, null);
    } else {
        DBHelper.fetchRestaurantById(id, (error, restaurant) => {
            self.restaurant = restaurant;
            if (!restaurant) {
                console.error(error);
                return;
            }
            fillRestaurantHTML();
            callback(null, restaurant);
        });
    }
};

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
    const name = document.getElementById('restaurant-name');
    name.innerHTML = restaurant.name;

    const address = document.getElementById('restaurant-address');
    address.innerHTML = restaurant.address;

    const image = document.getElementById('restaurant-img');
    image.className = 'restaurant-img';
    image.alt = `${restaurant.name} restaurant, address ${
        restaurant.address
    }, ${restaurant.cuisine_type} cuisine`;
    image.src = DBHelper.imageUrlForRestaurant(restaurant);

    const cuisine = document.getElementById('restaurant-cuisine');
    cuisine.innerHTML = restaurant.cuisine_type;

    // fill operating hours
    if (restaurant.operating_hours) {
        fillRestaurantHoursHTML();
    }
    // fill reviews
    fillReviewsHTML();
};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (
    operatingHours = self.restaurant.operating_hours,
) => {
    const hours = document.getElementById('restaurant-hours');
    for (let key in operatingHours) {
        const row = document.createElement('tr');

        const day = document.createElement('td');
        day.innerHTML = key;
        row.appendChild(day);

        const time = document.createElement('td');
        time.innerHTML = operatingHours[key];
        row.appendChild(time);

        hours.appendChild(row);
    }
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
    const container = document.getElementById('reviews-container');
    const title = document.createElement('h3');
    title.innerHTML = 'Reviews';
    container.appendChild(title);

    if (!reviews) {
        const noReviews = document.createElement('p');
        noReviews.innerHTML = 'No reviews yet!';
        container.appendChild(noReviews);
        return;
    }
    const ul = document.getElementById('reviews-list');
    reviews.forEach(review => {
        ul.appendChild(createReviewHTML(review));
    });
    container.appendChild(ul);
};
/**
 * Add new review to the review list and update it
 */
const updateReviewsHTML = (reviews = self.restaurant.reviews) => {
    const ul = document.getElementById('reviews-list');
    reviews.forEach(review => {
        ul.appendChild(createReviewHTML(review));
    });
};
/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = review => {
    const li = document.createElement('li');
    const name = document.createElement('p');
    name.innerHTML = review.name;
    li.appendChild(name);

    const rating = document.createElement('p');
    rating.innerHTML = `Rating: ${review.rating}`;
    li.appendChild(rating);

    const comments = document.createElement('p');
    comments.innerHTML = review.comments;
    li.appendChild(comments);

    return li;
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
    const breadcrumb = document.getElementById('breadcrumb');
    const li = document.createElement('li');
    // for accessibility
    const a = document.createElement('a');
    a.href = `restaurant.html?id=${restaurant.id}`;
    a.innerHTML = restaurant.name;
    a.setAttribute('aria-current', 'page');
    li.appendChild(a);
    breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
};

// add review button
const addReviewButton = document.getElementById('add_review');
// when button clicked it should check the form and add the review
addReviewButton.addEventListener('click', function() {
    let name = document.getElementById('user_name').value;
    let rating = document.getElementById('rating').value;
    let comments = document.getElementById('user_comment').value;
    if(!name.trim() || !rating || !comments.trim()) {
        alert('please add correct values then submit again') ;
        return ;
    }
    if (parseInt(rating)>5 || parseInt(rating) < 0){
        alert('rating value show be from 0 to 5') ;
        return ;
    }
    const review = { name, rating, comments };

    // update the list of reviews

    //
    DBHelper.addNewRestaurantReview(self.restaurant, review, (err, res) => {
        if (err) {
            console.error(`error updating the server data`);
        } else {
            console.log('updating the data successfully');
            updateReviewsHTML();
        }
    });
});
// listen for online event to make the user online
// when user is online update the server and DB
window.addEventListener('online', () => {
    DBHelper.updateServerAndDB(self.restaurant)
        .then(() => {
            console.log('done');
        })
        .catch(err => {
            console.error(err);
        });
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRiaGVscGVyLmpzIiwiaWRiLmpzIiwicmVzdGF1cmFudF9pbmZvLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2VEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6InJlc3RhdXJhbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQ29tbW9uIGRhdGFiYXNlIGhlbHBlciBmdW5jdGlvbnMuXHJcbiAqL1xyXG5jbGFzcyBEQkhlbHBlciB7XHJcbiAgICAvKipcclxuICAgICAqIERhdGFiYXNlIFVSTC5cclxuICAgICAqIENoYW5nZSB0aGlzIHRvIHJlc3RhdXJhbnRzLmpzb24gZmlsZSBsb2NhdGlvbiBvbiB5b3VyIHNlcnZlci5cclxuICAgICAqL1xyXG4gICAgc3RhdGljIGdldCBEQl9OQU1FKCkge1xyXG4gICAgICAgIHJldHVybiAncmVzdGF1cmFudHMtZGInO1xyXG4gICAgfVxyXG4gICAgc3RhdGljIGdldCBSRVNUQVVSQU5UU19PQkpFQ1RfU1RPUkUoKSB7XHJcbiAgICAgICAgcmV0dXJuICdyZXN0YXVyYW50cyc7XHJcbiAgICB9XHJcbiAgICBzdGF0aWMgZ2V0IFJFVklFV1NfT0JKRUNUX1NUT1JFKCkge1xyXG4gICAgICAgIHJldHVybiAncmV2aWV3cyc7XHJcbiAgICB9XHJcbiAgICBzdGF0aWMgb3BlbkRCKCkge1xyXG4gICAgICAgIC8vIG9wZW4gREJcclxuICAgICAgICByZXR1cm4gaWRiLm9wZW4oREJIZWxwZXIuREJfTkFNRSwgNCwgdXBncmFkZWREQiA9PiB7XHJcbiAgICAgICAgICAgIC8vIGNyZWF0ZSByZXN0YXVyYW50cyBzdG9yZVxyXG4gICAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgICAgICAhdXBncmFkZWREQi5vYmplY3RTdG9yZU5hbWVzLmNvbnRhaW5zKFxyXG4gICAgICAgICAgICAgICAgICAgIERCSGVscGVyLlJFU1RBVVJBTlRTX09CSkVDVF9TVE9SRSxcclxuICAgICAgICAgICAgICAgIClcclxuICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICB1cGdyYWRlZERCLmNyZWF0ZU9iamVjdFN0b3JlKFxyXG4gICAgICAgICAgICAgICAgICAgIERCSGVscGVyLlJFU1RBVVJBTlRTX09CSkVDVF9TVE9SRSxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleVBhdGg6ICdpZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHN0YXRpYyBnZXQgUkVTVEFVUkFOVFNfVVJMKCkge1xyXG4gICAgICAgIC8vIG5ldyB1cmwgZm9yIHRoZSBkYXRhXHJcbiAgICAgICAgcmV0dXJuIGBodHRwOi8vbG9jYWxob3N0OjEzMzcvcmVzdGF1cmFudHNgO1xyXG4gICAgfVxyXG4gICAgLy8gcmV2aWV3cyB1cmxcclxuICAgIHN0YXRpYyBnZXQgUkVWSUVXU19VUkwoKSB7XHJcbiAgICAgICAgcmV0dXJuICdodHRwOi8vbG9jYWxob3N0OjEzMzcvcmV2aWV3cy8nO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBGZXRjaCBhbGwgcmVzdGF1cmFudHMuXHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBhc3luYyBmZXRjaFJlc3RhdXJhbnRzKGNhbGxiYWNrKSB7XHJcbiAgICAgICAgLy9mZXRjaGluZyB0aGUgZGF0YSB3aXRoIGZldGNoIEFQSVxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG15X2RiID0gYXdhaXQgREJIZWxwZXIub3BlbkRCKCk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCByZXN0YXVyYW50c1R4ID0gbXlfZGIudHJhbnNhY3Rpb24oXHJcbiAgICAgICAgICAgICAgICBEQkhlbHBlci5SRVNUQVVSQU5UU19PQkpFQ1RfU1RPUkUsXHJcbiAgICAgICAgICAgICAgICAncmVhZHdyaXRlJyxcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgY29uc3QgcmVzdGF1cmFudHNTdG9yZSA9IHJlc3RhdXJhbnRzVHgub2JqZWN0U3RvcmUoXHJcbiAgICAgICAgICAgICAgICBEQkhlbHBlci5SRVNUQVVSQU5UU19PQkpFQ1RfU1RPUkUsXHJcbiAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICBsZXQgcmVzdGF1cmFudHMgPSBhd2FpdCByZXN0YXVyYW50c1N0b3JlLmdldEFsbCgpO1xyXG5cclxuICAgICAgICAgICAgLy8gaWYgYWxsIHJlc3RhdXJhbnRzIGV4aXN0XHJcbiAgICAgICAgICAgIGlmIChyZXN0YXVyYW50cy5sZW5ndGggPT09IDEwKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnd2UgYWxyZWFkeSBzdG9yZWQgb24gREInKTtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3RhdXJhbnRzKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXN0YXVyYW50cyA9IGF3YWl0IERCSGVscGVyLmZldGNoUmVzdGF1cmFudHNGcm9tTmV0d29yaygpO1xyXG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXN0YXVyYW50cyk7XHJcbiAgICAgICAgICAgIGF3YWl0IERCSGVscGVyLnNhdmVSZXN0YXVyYW50c09uREIocmVzdGF1cmFudHMpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgY2FsbGJhY2soZSwgbnVsbCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8gZmV0Y2ggcmVzdGF1cmFudHMgZGF0YSBmcm9tIG5ldHdvcmtcclxuICAgIHN0YXRpYyBhc3luYyBmZXRjaFJlc3RhdXJhbnRzRnJvbU5ldHdvcmsoKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB3aW5kb3cuZmV0Y2goREJIZWxwZXIuUkVTVEFVUkFOVFNfVVJMKTtcclxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm9rKSByZXR1cm4gcmVzcG9uc2UuanNvbigpO1xyXG4gICAgICAgICAgICAvLyByZXNwb25zZSBtYXkgb2NjdXIgYnV0IHdpdGggdGhlIHdyb25nIHN0YXR1cyBjb2RlXHJcbiAgICAgICAgICAgIC8vIHRoYXQgd2FuJ3QgcmVqZWN0IHRoZSBwcm9taXNlXHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChcclxuICAgICAgICAgICAgICAgIGBlcnJvciByZXR1cm5lZCB3aXRoICR7cmVzcG9uc2Uuc3RhdHVzfSBzdGF0dXMgY29kZWAsXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAvLyBpZiBhbnkgZXJyb3IgaGFwcGVuIHdoaWxlIGZldGNoaW5nXHJcbiAgICAgICAgICAgIC8vIGxpa2UgaW50ZXJuZXQgY29ubmVjdGl2aXR5IG9yIG5vdCB2YWxpZCB1cmxcclxuICAgICAgICAgICAgLy8gcmVqZWN0IGVycm9yXHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHJlc3RhdXJhbnRzICBhcnJheSBvZiBhbGwgcmVzdGF1cmFudHMgdG8gc3RvcmUgaW4gREJcclxuICAgICAqL1xyXG4gICAgc3RhdGljIGFzeW5jIHNhdmVSZXN0YXVyYW50c09uREIocmVzdGF1cmFudHMpIHtcclxuICAgICAgICBjb25zdCBteV9kYiA9IGF3YWl0IERCSGVscGVyLm9wZW5EQigpO1xyXG4gICAgICAgIGNvbnN0IHR4ID0gbXlfZGIudHJhbnNhY3Rpb24oXHJcbiAgICAgICAgICAgIERCSGVscGVyLlJFU1RBVVJBTlRTX09CSkVDVF9TVE9SRSxcclxuICAgICAgICAgICAgJ3JlYWR3cml0ZScsXHJcbiAgICAgICAgKTtcclxuICAgICAgICBjb25zdCBzdG9yZSA9IHR4Lm9iamVjdFN0b3JlKERCSGVscGVyLlJFU1RBVVJBTlRTX09CSkVDVF9TVE9SRSk7XHJcbiAgICAgICAgcmV0dXJuIHJlc3RhdXJhbnRzLmZvckVhY2goYXN5bmMgcmVzdGF1cmFudCA9PiB7XHJcbiAgICAgICAgICAgIC8vIGNoZWNrIGlmIHZhbHVlcyBhbHJlYWR5IGV4aXN0XHJcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gYXdhaXQgc3RvcmUuZ2V0KHJlc3RhdXJhbnQuaWQpO1xyXG4gICAgICAgICAgICBpZiAodmFsdWUpIHJldHVybjtcclxuICAgICAgICAgICAgYXdhaXQgc3RvcmUuYWRkKHJlc3RhdXJhbnQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogRmV0Y2ggYSByZXN0YXVyYW50IGJ5IGl0cyBJRC5cclxuICAgICAqL1xyXG4gICAgc3RhdGljIGFzeW5jIGZldGNoUmVzdGF1cmFudEJ5SWQoaWQsIGNhbGxiYWNrKSB7XHJcbiAgICAgICAgLy8gZmV0Y2ggYWxsIHJlc3RhdXJhbnRzIHdpdGggcHJvcGVyIGVycm9yIGhhbmRsaW5nLlxyXG4gICAgICAgIGxldCByZXN0YXVyYW50LCByZXZpZXdzO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIGdldCB0aGUgcmVzdGF1cmFudCBmcm9tIGRiIGZpcnN0XHJcbiAgICAgICAgICAgIGNvbnN0IG15X2RiID0gYXdhaXQgREJIZWxwZXIub3BlbkRCKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHR4ID0gbXlfZGIudHJhbnNhY3Rpb24oREJIZWxwZXIuUkVTVEFVUkFOVFNfT0JKRUNUX1NUT1JFKTtcclxuICAgICAgICAgICAgY29uc3QgcmVzdGF1cmFudHNTdG9yZSA9IHR4Lm9iamVjdFN0b3JlKFxyXG4gICAgICAgICAgICAgICAgREJIZWxwZXIuUkVTVEFVUkFOVFNfT0JKRUNUX1NUT1JFLFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgICBsZXQgcmVzdGF1cmFudCA9IGF3YWl0IHJlc3RhdXJhbnRzU3RvcmUuZ2V0KHBhcnNlSW50KGlkKSk7XHJcbiAgICAgICAgICAgIC8vIGlmIGl0IGV4aXN0XHJcbiAgICAgICAgICAgIGlmIChyZXN0YXVyYW50KSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnSSBhbSBleGlzdCBvbiBEQicpO1xyXG4gICAgICAgICAgICAgICAgLy8gZ2V0IHJlc3RhdXJhbnRzIHJldmlld3NcclxuICAgICAgICAgICAgICAgIC8vIGNoZWNrIGlmIGl0IGhhcyByZXZpZXdzXHJcbiAgICAgICAgICAgICAgICBpZiAocmVzdGF1cmFudC5yZXZpZXdzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYHJldmlld3MgZXhpc3QgYCwgcmVzdGF1cmFudC5yZXZpZXdzKTtcclxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXN0YXVyYW50KTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBlbHNlIHdlIGdldCBpdCBmcm9tIHRoZSBuZXR3b3JrXHJcbiAgICAgICAgICAgICAgICByZXZpZXdzID0gYXdhaXQgREJIZWxwZXIuZ2V0UmVzdGF1cmFudFJldmlld3MoaWQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHJldmlld3MpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyB1cGRhdGUgcmVzdGF1cmFudCBpbiB0aGUgZGJcclxuICAgICAgICAgICAgICAgICAgICByZXN0YXVyYW50LnJldmlld3MgPSByZXZpZXdzO1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IERCSGVscGVyLnVwZGF0ZVJlc3RhdXJhbnRJbkRCKHJlc3RhdXJhbnQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdGF1cmFudCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gZ2V0IHJlc3RhdXJhbnQgYW5kIHJldmlld3NcclxuICAgICAgICAgICAgcmVzdGF1cmFudCA9IGF3YWl0IERCSGVscGVyLmZldGNoUmVzdGF1cmFudEZyb21OZXR3b3JrKGlkKTtcclxuICAgICAgICAgICAgcmV2aWV3cyA9IGF3YWl0IERCSGVscGVyLmdldFJlc3RhdXJhbnRSZXZpZXdzKGlkKTtcclxuICAgICAgICAgICAgcmVzdGF1cmFudC5yZXZpZXdzID0gcmV2aWV3cztcclxuXHJcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3RhdXJhbnQpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgY2FsbGJhY2soZSwgbnVsbCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8gZmV0Y2ggcmVzdGF1cmFudCB3aXRoIHNwZWNpZmllZCBJZCBmb3JtIG5ldHdvcmtcclxuICAgIHN0YXRpYyBhc3luYyBmZXRjaFJlc3RhdXJhbnRGcm9tTmV0d29yayhpZCkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG15X2RiID0gYXdhaXQgREJIZWxwZXIub3BlbkRCKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHR4ID0gbXlfZGIudHJhbnNhY3Rpb24oXHJcbiAgICAgICAgICAgICAgICBEQkhlbHBlci5SRVNUQVVSQU5UU19PQkpFQ1RfU1RPUkUsXHJcbiAgICAgICAgICAgICAgICAncmVhZHdyaXRlJyxcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgY29uc3Qgc3RvcmUgPSB0eC5vYmplY3RTdG9yZShEQkhlbHBlci5SRVNUQVVSQU5UU19PQkpFQ1RfU1RPUkUpO1xyXG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke0RCSGVscGVyLlJFU1RBVVJBTlRTX1VSTH0vJHtpZH1gKTtcclxuICAgICAgICAgICAgLy8gaWYgdGhlIHJlc3BvbnNlIGlzIHN1Y2Nlc3NcclxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm9rKSB7XHJcbiAgICAgICAgICAgICAgICBzdG9yZS5hZGQocmVzcG9uc2UuanNvbigpKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KFxyXG4gICAgICAgICAgICAgICAgYGVycm9yIHJldHVybmVkIHdpdGggc3RhdHVzICR7cmVzcG9uc2Uuc3RhdHVzfWAsXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBGZXRjaCByZXN0YXVyYW50cyBieSBhIGN1aXNpbmUgdHlwZSB3aXRoIHByb3BlciBlcnJvciBoYW5kbGluZy5cclxuICAgICAqL1xyXG4gICAgc3RhdGljIGZldGNoUmVzdGF1cmFudEJ5Q3Vpc2luZShjdWlzaW5lLCBjYWxsYmFjaykge1xyXG4gICAgICAgIC8vIEZldGNoIGFsbCByZXN0YXVyYW50cyAgd2l0aCBwcm9wZXIgZXJyb3IgaGFuZGxpbmdcclxuICAgICAgICBEQkhlbHBlci5mZXRjaFJlc3RhdXJhbnRzKChlcnJvciwgcmVzdGF1cmFudHMpID0+IHtcclxuICAgICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBGaWx0ZXIgcmVzdGF1cmFudHMgdG8gaGF2ZSBvbmx5IGdpdmVuIGN1aXNpbmUgdHlwZVxyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0cyA9IHJlc3RhdXJhbnRzLmZpbHRlcihcclxuICAgICAgICAgICAgICAgICAgICByID0+IHIuY3Vpc2luZV90eXBlID09IGN1aXNpbmUsXHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0cyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEZldGNoIHJlc3RhdXJhbnRzIGJ5IGEgbmVpZ2hib3Job29kIHdpdGggcHJvcGVyIGVycm9yIGhhbmRsaW5nLlxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgZmV0Y2hSZXN0YXVyYW50QnlOZWlnaGJvcmhvb2QobmVpZ2hib3Job29kLCBjYWxsYmFjaykge1xyXG4gICAgICAgIC8vIEZldGNoIGFsbCByZXN0YXVyYW50c1xyXG4gICAgICAgIERCSGVscGVyLmZldGNoUmVzdGF1cmFudHMoKGVycm9yLCByZXN0YXVyYW50cykgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIEZpbHRlciByZXN0YXVyYW50cyB0byBoYXZlIG9ubHkgZ2l2ZW4gbmVpZ2hib3Job29kXHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHRzID0gcmVzdGF1cmFudHMuZmlsdGVyKFxyXG4gICAgICAgICAgICAgICAgICAgIHIgPT4gci5uZWlnaGJvcmhvb2QgPT0gbmVpZ2hib3Job29kLFxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdHMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBGZXRjaCByZXN0YXVyYW50cyBieSBhIGN1aXNpbmUgYW5kIGEgbmVpZ2hib3Job29kIHdpdGggcHJvcGVyIGVycm9yIGhhbmRsaW5nLlxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgZmV0Y2hSZXN0YXVyYW50QnlDdWlzaW5lQW5kTmVpZ2hib3Job29kKFxyXG4gICAgICAgIGN1aXNpbmUsXHJcbiAgICAgICAgbmVpZ2hib3Job29kLFxyXG4gICAgICAgIGNhbGxiYWNrLFxyXG4gICAgKSB7XHJcbiAgICAgICAgLy8gRmV0Y2ggYWxsIHJlc3RhdXJhbnRzXHJcbiAgICAgICAgREJIZWxwZXIuZmV0Y2hSZXN0YXVyYW50cygoZXJyb3IsIHJlc3RhdXJhbnRzKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbGV0IHJlc3VsdHMgPSByZXN0YXVyYW50cztcclxuICAgICAgICAgICAgICAgIGlmIChjdWlzaW5lICE9ICdhbGwnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gZmlsdGVyIGJ5IGN1aXNpbmVcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHRzID0gcmVzdWx0cy5maWx0ZXIociA9PiByLmN1aXNpbmVfdHlwZSA9PSBjdWlzaW5lKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChuZWlnaGJvcmhvb2QgIT0gJ2FsbCcpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBmaWx0ZXIgYnkgbmVpZ2hib3Job29kXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0cyA9IHJlc3VsdHMuZmlsdGVyKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByID0+IHIubmVpZ2hib3Job29kID09IG5laWdoYm9yaG9vZCxcclxuICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0cyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEZldGNoIGFsbCBuZWlnaGJvcmhvb2RzIHdpdGggcHJvcGVyIGVycm9yIGhhbmRsaW5nLlxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgZmV0Y2hOZWlnaGJvcmhvb2RzKGNhbGxiYWNrKSB7XHJcbiAgICAgICAgLy8gRmV0Y2ggYWxsIHJlc3RhdXJhbnRzXHJcbiAgICAgICAgREJIZWxwZXIuZmV0Y2hSZXN0YXVyYW50cygoZXJyb3IsIHJlc3RhdXJhbnRzKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gR2V0IGFsbCBuZWlnaGJvcmhvb2RzIGZyb20gYWxsIHJlc3RhdXJhbnRzXHJcbiAgICAgICAgICAgICAgICBjb25zdCBuZWlnaGJvcmhvb2RzID0gcmVzdGF1cmFudHMubWFwKFxyXG4gICAgICAgICAgICAgICAgICAgICh2LCBpKSA9PiByZXN0YXVyYW50c1tpXS5uZWlnaGJvcmhvb2QsXHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGR1cGxpY2F0ZXMgZnJvbSBuZWlnaGJvcmhvb2RzXHJcbiAgICAgICAgICAgICAgICBjb25zdCB1bmlxdWVOZWlnaGJvcmhvb2RzID0gbmVpZ2hib3Job29kcy5maWx0ZXIoXHJcbiAgICAgICAgICAgICAgICAgICAgKHYsIGkpID0+IG5laWdoYm9yaG9vZHMuaW5kZXhPZih2KSA9PSBpLFxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHVuaXF1ZU5laWdoYm9yaG9vZHMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBGZXRjaCBhbGwgY3Vpc2luZXMgd2l0aCBwcm9wZXIgZXJyb3IgaGFuZGxpbmcuXHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBmZXRjaEN1aXNpbmVzKGNhbGxiYWNrKSB7XHJcbiAgICAgICAgLy8gRmV0Y2ggYWxsIHJlc3RhdXJhbnRzXHJcbiAgICAgICAgREJIZWxwZXIuZmV0Y2hSZXN0YXVyYW50cygoZXJyb3IsIHJlc3RhdXJhbnRzKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gR2V0IGFsbCBjdWlzaW5lcyBmcm9tIGFsbCByZXN0YXVyYW50c1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY3Vpc2luZXMgPSByZXN0YXVyYW50cy5tYXAoXHJcbiAgICAgICAgICAgICAgICAgICAgKHYsIGkpID0+IHJlc3RhdXJhbnRzW2ldLmN1aXNpbmVfdHlwZSxcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgZHVwbGljYXRlcyBmcm9tIGN1aXNpbmVzXHJcbiAgICAgICAgICAgICAgICBjb25zdCB1bmlxdWVDdWlzaW5lcyA9IGN1aXNpbmVzLmZpbHRlcihcclxuICAgICAgICAgICAgICAgICAgICAodiwgaSkgPT4gY3Vpc2luZXMuaW5kZXhPZih2KSA9PSBpLFxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHVuaXF1ZUN1aXNpbmVzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVzdGF1cmFudCBwYWdlIFVSTC5cclxuICAgICAqL1xyXG4gICAgc3RhdGljIHVybEZvclJlc3RhdXJhbnQocmVzdGF1cmFudCkge1xyXG4gICAgICAgIHJldHVybiBgLi9yZXN0YXVyYW50Lmh0bWw/aWQ9JHtyZXN0YXVyYW50LmlkfWA7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZXN0YXVyYW50IGltYWdlIFVSTC5cclxuICAgICAqL1xyXG4gICAgc3RhdGljIGltYWdlVXJsRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KSB7XHJcbiAgICAgICAgLy8gcmV0dXJuIHRoZSBvcHRpbWl6ZWQgaW1hZ2VzIGZvciB0aGUgY3VycmVudCBwYWdlXHJcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5pbmNsdWRlcygncmVzdGF1cmFudC5odG1sJylcclxuICAgICAgICAgICAgPyBgL2ltZy8ke3Jlc3RhdXJhbnQuaWR9LmpwZ2BcclxuICAgICAgICAgICAgOiBgL2ltZy9zbWFsbGltZy8ke3Jlc3RhdXJhbnQuaWR9LmpwZ2A7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBNYXAgbWFya2VyIGZvciBhIHJlc3RhdXJhbnQuXHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBtYXBNYXJrZXJGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQsIG1hcCkge1xyXG4gICAgICAgIGNvbnN0IG1hcmtlciA9IG5ldyBnb29nbGUubWFwcy5NYXJrZXIoe1xyXG4gICAgICAgICAgICBwb3NpdGlvbjogcmVzdGF1cmFudC5sYXRsbmcsXHJcbiAgICAgICAgICAgIHRpdGxlOiByZXN0YXVyYW50Lm5hbWUsXHJcbiAgICAgICAgICAgIHVybDogREJIZWxwZXIudXJsRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KSxcclxuICAgICAgICAgICAgbWFwOiBtYXAsXHJcbiAgICAgICAgICAgIGFuaW1hdGlvbjogZ29vZ2xlLm1hcHMuQW5pbWF0aW9uLkRST1AsXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIG1hcmtlcjtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENoYW5nZSByZXN0YXVyYW50IGlzX2Zhdm9yaXRlIHByb3AgdG8gaXRzIG9wcG9zaXRlIHZhbHVlXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHJlc3RhdXJhbnQgdGhlIHJlc3RhdXJhbnQgdG8gY2hhbmdlIGl0cyBmYXZvcml0ZSBzdGF0ZVxyXG4gICAgICogQHBhcmFtIGNiIGNhbGxiYWNrIHRvIHJ1biBhZnRlciByZXF1ZXN0XHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBhc3luYyBjaGFuZ2VSZXN0YXVyYW50RmF2b3JpdGUocmVzdGF1cmFudCwgY2IpIHtcclxuICAgICAgICBjb25zdCB7IGlzX2Zhdm9yaXRlLCBpZCB9ID0gcmVzdGF1cmFudDtcclxuICAgICAgICBjb25zdCBuZXdJc0Zhdm9yaXRlID0gaXNfZmF2b3JpdGUgPT09ICdmYWxzZScgPyAndHJ1ZScgOiAnZmFsc2UnO1xyXG4gICAgICAgIHJlc3RhdXJhbnQuaXNfZmF2b3JpdGUgPSBuZXdJc0Zhdm9yaXRlO1xyXG4gICAgICAgIGF3YWl0IERCSGVscGVyLnVwZGF0ZVJlc3RhdXJhbnRJbkRCKHJlc3RhdXJhbnQpO1xyXG4gICAgICAgIGZldGNoKFxyXG4gICAgICAgICAgICBgaHR0cDovL2xvY2FsaG9zdDoxMzM3L3Jlc3RhdXJhbnRzLyR7aWR9XHJcbiAgICAgICAgLz9pc19mYXZvcml0ZT0ke25ld0lzRmF2b3JpdGV9YCxcclxuICAgICAgICAgICAgeyBtZXRob2Q6ICdQVVQnIH0sXHJcbiAgICAgICAgKVxyXG4gICAgICAgICAgICAudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcclxuICAgICAgICAgICAgLy8gaWYgaXQgd29ya3MgcGFzcyB0aGUgbmV3IGlzX2Zhdm9yaXRlIHRvIGNhbGxiYWNrXHJcbiAgICAgICAgICAgIC50aGVuKHJlc3QgPT4gY2IobnVsbCwgcmVzdC5pc19mYXZvcml0ZSkpXHJcbiAgICAgICAgICAgIC8vIGlmIGFueSBlcnJvciBoYXBwZW4gcGFzcyB0byB0aGUgY2FsbGJhY2tcclxuICAgICAgICAgICAgLmNhdGNoKGVyciA9PiBjYihlcnIpKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGZvcm1hdCBEYXRlIHRvIGxvb2sgbmljZXJcclxuICAgICAqIEBwYXJhbSBkYXRlIGluIG1pbGxpc2Vjb25kc1xyXG4gICAgICogQHJldHVybnMge3N0cmluZ30gdGhlIGZvcm1hdHRlZCBEYXRlXHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBmb3JtYXREYXRlKGRhdGUpIHtcclxuICAgICAgICByZXR1cm4gbmV3IERhdGUoZGF0ZSkudG9Mb2NhbGVEYXRlU3RyaW5nKCdlbi1VUycsIHtcclxuICAgICAgICAgICAgd2Vla2RheTogJ2xvbmcnLFxyXG4gICAgICAgICAgICB5ZWFyOiAnbnVtZXJpYycsXHJcbiAgICAgICAgICAgIG1vbnRoOiAnc2hvcnQnLFxyXG4gICAgICAgICAgICBkYXk6ICdudW1lcmljJyxcclxuICAgICAgICAgICAgaG91cjogJzItZGlnaXQnLFxyXG4gICAgICAgICAgICBtaW51dGU6ICcyLWRpZ2l0JyxcclxuICAgICAgICAgICAgc2Vjb25kczogJzItZGlnaXQnLFxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgc3RhdGljIGFzeW5jIGFkZE5ld1Jlc3RhdXJhbnRSZXZpZXcocmVzdGF1cmFudCwgcmV2aWV3LCBjYikge1xyXG4gICAgICAgIC8vIGlmIHVzZXIgaXMgb2ZmbGluZSBqdXN0IHNhdmUgdGhlIG5ldyByZXZpZXcgb24gREJcclxuICAgICAgICBpZiAoIW5hdmlnYXRvci5vbkxpbmUpIHtcclxuICAgICAgICAgICAgLy8gc2F2ZSByZXN0YXVyYW50IG9uREIgd2l0aCB0aGUgbmV3IHJldmlld1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgcmVzdGF1cmFudC5yZXZpZXdzID0gW1xyXG4gICAgICAgICAgICAgICAgICAgIC4uLnJlc3RhdXJhbnQucmV2aWV3cyxcclxuICAgICAgICAgICAgICAgICAgICB7IHJlc3RhdXJhbnRfaWQ6IHJlc3RhdXJhbnQuaWQsIC4uLnJldmlldyB9LFxyXG4gICAgICAgICAgICAgICAgXTtcclxuICAgICAgICAgICAgICAgIGF3YWl0IERCSGVscGVyLnVwZGF0ZVJlc3RhdXJhbnRJbkRCKHJlc3RhdXJhbnQpO1xyXG4gICAgICAgICAgICAgICAgY2IoXHJcbiAgICAgICAgICAgICAgICAgICAgbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBcIllvdSBhcmUgb2ZmbGluZSByZXZpZXcgc2F2ZWQgbG9jYWxseSB3aGVuIHlvdSdyZSBvbmxpbmUgZGF0YSB3aWxsIHNlbnQgdG8gc2VydmVyXCIsXHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICBjYihlLCBudWxsKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgc2VydmVyIGFwaSBhbmQgdGhlIERCIGFzIHdlbGxcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IGZldGNoKCdodHRwOi8vbG9jYWxob3N0OjEzMzcvcmV2aWV3cycsIHtcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICAgICAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3RhdXJhbnRfaWQ6IHJlc3RhdXJhbnQuaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC4uLnJldmlldyxcclxuICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXHJcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4obmV3UmV2aWV3ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdGF1cmFudC5yZXZpZXdzID0gWy4uLnJlc3RhdXJhbnQucmV2aWV3cywgbmV3UmV2aWV3XTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzdGF1cmFudC5yZXZpZXdzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2IobnVsbCwgJ2RhdGEgc2F2ZWQgdG8gdGhlIHNlcnZlciBzdWNjZXNzZnVsbHkgJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCBEQkhlbHBlci51cGRhdGVSZXN0YXVyYW50SW5EQihyZXN0YXVyYW50KTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgY2IoZSwgbnVsbCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGFzeW5jIGdldFJlc3RhdXJhbnRSZXZpZXdzKGlkKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgbGV0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goXHJcbiAgICAgICAgICAgICAgICBgJHtEQkhlbHBlci5SRVZJRVdTX1VSTH0/cmVzdGF1cmFudF9pZD0ke2lkfWAsXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5vaykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGFzeW5jIHVwZGF0ZVJlc3RhdXJhbnRJbkRCKHJlc3RhdXJhbnQpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnaWQgaXMgJywgcmVzdGF1cmFudC5pZCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ2lkIGlzICcsIHJlc3RhdXJhbnQuaWQpO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG15X2RiID0gYXdhaXQgREJIZWxwZXIub3BlbkRCKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHR4ID0gbXlfZGIudHJhbnNhY3Rpb24oXHJcbiAgICAgICAgICAgICAgICBEQkhlbHBlci5SRVNUQVVSQU5UU19PQkpFQ1RfU1RPUkUsXHJcbiAgICAgICAgICAgICAgICAncmVhZHdyaXRlJyxcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgY29uc3QgcmVzdGF1cmFudHNTdG9yZSA9IHR4Lm9iamVjdFN0b3JlKFxyXG4gICAgICAgICAgICAgICAgREJIZWxwZXIuUkVTVEFVUkFOVFNfT0JKRUNUX1NUT1JFLFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgICBhd2FpdCByZXN0YXVyYW50c1N0b3JlLnB1dChyZXN0YXVyYW50KTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2cocmVzdGF1cmFudCk7XHJcbiAgICAgICAgICAgIHJldHVybiAnc3VjY2Vzcyc7XHJcbiAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHN0YXRpYyBhc3luYyB1cGRhdGVTZXJ2ZXJBbmREQihyZXN0YXVyYW50KSB7XHJcbiAgICAgICAgY29uc3QgbmV3UmV2aWV3cyA9IFtdO1xyXG4gICAgICAgIGlmIChyZXN0YXVyYW50KSB7XHJcbiAgICAgICAgICAgdHJ5e1xyXG4gICAgICAgICAgICAgICByZXN0YXVyYW50LnJldmlld3MuZm9yRWFjaChhc3luYyByZXZpZXcgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgLy8gaWYgcmV2aWV3IGlzIGFscmVhZHkgb24gdGhlIHNlcnZlciBqdXN0IHB1c2ggaXRcclxuICAgICAgICAgICAgICAgICAgIGlmIChyZXZpZXcuaWQpIG5ld1Jldmlld3MucHVzaChyZXZpZXcpO1xyXG4gICAgICAgICAgICAgICAgICAgLy8gZWxzZSBmZXRjaCAgaXQgdG8gdGhlIHNlcnZlciBhbmQgdXBkYXRlIGl0IG9uIERCXHJcbiAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnSSBhbSBoZXJlICcpIDtcclxuICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBmZXRjaChgJHtEQkhlbHBlci5SRVZJRVdTX1VSTH1gLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IC4uLnJldmlldyB9KSxcclxuICAgICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4ocmVzUmV2aWV3ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc1Jldmlldyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdSZXZpZXdzLnB1c2gocmVzUmV2aWV3KSA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC5jYXRjaChlcnIgPT4gY29uc29sZS5sb2coZXJyKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0kgYW0gaGVyZSAyJykgO1xyXG4gICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgcmVzdGF1cmFudC5yZXZpZXdzID0gbmV3UmV2aWV3cztcclxuICAgICAgICAgICAgICAgY29uc29sZS5sb2cobmV3UmV2aWV3cyk7XHJcbiAgICAgICAgICAgICAgIGF3YWl0IERCSGVscGVyLnVwZGF0ZVJlc3RhdXJhbnRJbkRCKHJlc3RhdXJhbnQpO1xyXG4gICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCdkb25lJyk7XHJcbiAgICAgICAgICAgfVxyXG4gICAgICAgICAgIGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlKTtcclxuICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbihmdW5jdGlvbigpIHtcclxuICAgIGZ1bmN0aW9uIHRvQXJyYXkoYXJyKSB7XHJcbiAgICAgICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFycik7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcHJvbWlzaWZ5UmVxdWVzdChyZXF1ZXN0KSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShyZXF1ZXN0LnJlc3VsdCk7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIHJlamVjdChyZXF1ZXN0LmVycm9yKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwcm9taXNpZnlSZXF1ZXN0Q2FsbChvYmosIG1ldGhvZCwgYXJncykge1xyXG4gICAgICAgIHZhciByZXF1ZXN0O1xyXG4gICAgICAgIHZhciBwID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgICAgIHJlcXVlc3QgPSBvYmpbbWV0aG9kXS5hcHBseShvYmosIGFyZ3MpO1xyXG4gICAgICAgICAgICBwcm9taXNpZnlSZXF1ZXN0KHJlcXVlc3QpLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcC5yZXF1ZXN0ID0gcmVxdWVzdDtcclxuICAgICAgICByZXR1cm4gcDtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwcm9taXNpZnlDdXJzb3JSZXF1ZXN0Q2FsbChvYmosIG1ldGhvZCwgYXJncykge1xyXG4gICAgICAgIHZhciBwID0gcHJvbWlzaWZ5UmVxdWVzdENhbGwob2JqLCBtZXRob2QsIGFyZ3MpO1xyXG4gICAgICAgIHJldHVybiBwLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuO1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IEN1cnNvcih2YWx1ZSwgcC5yZXF1ZXN0KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwcm94eVByb3BlcnRpZXMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgcHJvcGVydGllcykge1xyXG4gICAgICAgIHByb3BlcnRpZXMuZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XHJcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShQcm94eUNsYXNzLnByb3RvdHlwZSwgcHJvcCwge1xyXG4gICAgICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpc1t0YXJnZXRQcm9wXVtwcm9wXTtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXNbdGFyZ2V0UHJvcF1bcHJvcF0gPSB2YWw7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHByb3h5UmVxdWVzdE1ldGhvZHMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgQ29uc3RydWN0b3IsIHByb3BlcnRpZXMpIHtcclxuICAgICAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xyXG4gICAgICAgICAgICBpZiAoIShwcm9wIGluIENvbnN0cnVjdG9yLnByb3RvdHlwZSkpIHJldHVybjtcclxuICAgICAgICAgICAgUHJveHlDbGFzcy5wcm90b3R5cGVbcHJvcF0gPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBwcm9taXNpZnlSZXF1ZXN0Q2FsbCh0aGlzW3RhcmdldFByb3BdLCBwcm9wLCBhcmd1bWVudHMpO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHByb3h5TWV0aG9kcyhQcm94eUNsYXNzLCB0YXJnZXRQcm9wLCBDb25zdHJ1Y3RvciwgcHJvcGVydGllcykge1xyXG4gICAgICAgIHByb3BlcnRpZXMuZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XHJcbiAgICAgICAgICAgIGlmICghKHByb3AgaW4gQ29uc3RydWN0b3IucHJvdG90eXBlKSkgcmV0dXJuO1xyXG4gICAgICAgICAgICBQcm94eUNsYXNzLnByb3RvdHlwZVtwcm9wXSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXNbdGFyZ2V0UHJvcF1bcHJvcF0uYXBwbHkodGhpc1t0YXJnZXRQcm9wXSwgYXJndW1lbnRzKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwcm94eUN1cnNvclJlcXVlc3RNZXRob2RzKFByb3h5Q2xhc3MsIHRhcmdldFByb3AsIENvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSB7XHJcbiAgICAgICAgcHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcclxuICAgICAgICAgICAgaWYgKCEocHJvcCBpbiBDb25zdHJ1Y3Rvci5wcm90b3R5cGUpKSByZXR1cm47XHJcbiAgICAgICAgICAgIFByb3h5Q2xhc3MucHJvdG90eXBlW3Byb3BdID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvbWlzaWZ5Q3Vyc29yUmVxdWVzdENhbGwodGhpc1t0YXJnZXRQcm9wXSwgcHJvcCwgYXJndW1lbnRzKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBJbmRleChpbmRleCkge1xyXG4gICAgICAgIHRoaXMuX2luZGV4ID0gaW5kZXg7XHJcbiAgICB9XHJcblxyXG4gICAgcHJveHlQcm9wZXJ0aWVzKEluZGV4LCAnX2luZGV4JywgW1xyXG4gICAgICAgICduYW1lJyxcclxuICAgICAgICAna2V5UGF0aCcsXHJcbiAgICAgICAgJ211bHRpRW50cnknLFxyXG4gICAgICAgICd1bmlxdWUnXHJcbiAgICBdKTtcclxuXHJcbiAgICBwcm94eVJlcXVlc3RNZXRob2RzKEluZGV4LCAnX2luZGV4JywgSURCSW5kZXgsIFtcclxuICAgICAgICAnZ2V0JyxcclxuICAgICAgICAnZ2V0S2V5JyxcclxuICAgICAgICAnZ2V0QWxsJyxcclxuICAgICAgICAnZ2V0QWxsS2V5cycsXHJcbiAgICAgICAgJ2NvdW50J1xyXG4gICAgXSk7XHJcblxyXG4gICAgcHJveHlDdXJzb3JSZXF1ZXN0TWV0aG9kcyhJbmRleCwgJ19pbmRleCcsIElEQkluZGV4LCBbXHJcbiAgICAgICAgJ29wZW5DdXJzb3InLFxyXG4gICAgICAgICdvcGVuS2V5Q3Vyc29yJ1xyXG4gICAgXSk7XHJcblxyXG4gICAgZnVuY3Rpb24gQ3Vyc29yKGN1cnNvciwgcmVxdWVzdCkge1xyXG4gICAgICAgIHRoaXMuX2N1cnNvciA9IGN1cnNvcjtcclxuICAgICAgICB0aGlzLl9yZXF1ZXN0ID0gcmVxdWVzdDtcclxuICAgIH1cclxuXHJcbiAgICBwcm94eVByb3BlcnRpZXMoQ3Vyc29yLCAnX2N1cnNvcicsIFtcclxuICAgICAgICAnZGlyZWN0aW9uJyxcclxuICAgICAgICAna2V5JyxcclxuICAgICAgICAncHJpbWFyeUtleScsXHJcbiAgICAgICAgJ3ZhbHVlJ1xyXG4gICAgXSk7XHJcblxyXG4gICAgcHJveHlSZXF1ZXN0TWV0aG9kcyhDdXJzb3IsICdfY3Vyc29yJywgSURCQ3Vyc29yLCBbXHJcbiAgICAgICAgJ3VwZGF0ZScsXHJcbiAgICAgICAgJ2RlbGV0ZSdcclxuICAgIF0pO1xyXG5cclxuICAgIC8vIHByb3h5ICduZXh0JyBtZXRob2RzXHJcbiAgICBbJ2FkdmFuY2UnLCAnY29udGludWUnLCAnY29udGludWVQcmltYXJ5S2V5J10uZm9yRWFjaChmdW5jdGlvbihtZXRob2ROYW1lKSB7XHJcbiAgICAgICAgaWYgKCEobWV0aG9kTmFtZSBpbiBJREJDdXJzb3IucHJvdG90eXBlKSkgcmV0dXJuO1xyXG4gICAgICAgIEN1cnNvci5wcm90b3R5cGVbbWV0aG9kTmFtZV0gPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIGN1cnNvciA9IHRoaXM7XHJcbiAgICAgICAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCkudGhlbihmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIGN1cnNvci5fY3Vyc29yW21ldGhvZE5hbWVdLmFwcGx5KGN1cnNvci5fY3Vyc29yLCBhcmdzKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBwcm9taXNpZnlSZXF1ZXN0KGN1cnNvci5fcmVxdWVzdCkudGhlbihmdW5jdGlvbih2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdmFsdWUpIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEN1cnNvcih2YWx1ZSwgY3Vyc29yLl9yZXF1ZXN0KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG4gICAgfSk7XHJcblxyXG4gICAgZnVuY3Rpb24gT2JqZWN0U3RvcmUoc3RvcmUpIHtcclxuICAgICAgICB0aGlzLl9zdG9yZSA9IHN0b3JlO1xyXG4gICAgfVxyXG5cclxuICAgIE9iamVjdFN0b3JlLnByb3RvdHlwZS5jcmVhdGVJbmRleCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiBuZXcgSW5kZXgodGhpcy5fc3RvcmUuY3JlYXRlSW5kZXguYXBwbHkodGhpcy5fc3RvcmUsIGFyZ3VtZW50cykpO1xyXG4gICAgfTtcclxuXHJcbiAgICBPYmplY3RTdG9yZS5wcm90b3R5cGUuaW5kZXggPSBmdW5jdGlvbigpIHtcclxuICAgICAgICByZXR1cm4gbmV3IEluZGV4KHRoaXMuX3N0b3JlLmluZGV4LmFwcGx5KHRoaXMuX3N0b3JlLCBhcmd1bWVudHMpKTtcclxuICAgIH07XHJcblxyXG4gICAgcHJveHlQcm9wZXJ0aWVzKE9iamVjdFN0b3JlLCAnX3N0b3JlJywgW1xyXG4gICAgICAgICduYW1lJyxcclxuICAgICAgICAna2V5UGF0aCcsXHJcbiAgICAgICAgJ2luZGV4TmFtZXMnLFxyXG4gICAgICAgICdhdXRvSW5jcmVtZW50J1xyXG4gICAgXSk7XHJcblxyXG4gICAgcHJveHlSZXF1ZXN0TWV0aG9kcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIElEQk9iamVjdFN0b3JlLCBbXHJcbiAgICAgICAgJ3B1dCcsXHJcbiAgICAgICAgJ2FkZCcsXHJcbiAgICAgICAgJ2RlbGV0ZScsXHJcbiAgICAgICAgJ2NsZWFyJyxcclxuICAgICAgICAnZ2V0JyxcclxuICAgICAgICAnZ2V0QWxsJyxcclxuICAgICAgICAnZ2V0S2V5JyxcclxuICAgICAgICAnZ2V0QWxsS2V5cycsXHJcbiAgICAgICAgJ2NvdW50J1xyXG4gICAgXSk7XHJcblxyXG4gICAgcHJveHlDdXJzb3JSZXF1ZXN0TWV0aG9kcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIElEQk9iamVjdFN0b3JlLCBbXHJcbiAgICAgICAgJ29wZW5DdXJzb3InLFxyXG4gICAgICAgICdvcGVuS2V5Q3Vyc29yJ1xyXG4gICAgXSk7XHJcblxyXG4gICAgcHJveHlNZXRob2RzKE9iamVjdFN0b3JlLCAnX3N0b3JlJywgSURCT2JqZWN0U3RvcmUsIFtcclxuICAgICAgICAnZGVsZXRlSW5kZXgnXHJcbiAgICBdKTtcclxuXHJcbiAgICBmdW5jdGlvbiBUcmFuc2FjdGlvbihpZGJUcmFuc2FjdGlvbikge1xyXG4gICAgICAgIHRoaXMuX3R4ID0gaWRiVHJhbnNhY3Rpb247XHJcbiAgICAgICAgdGhpcy5jb21wbGV0ZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgICAgICBpZGJUcmFuc2FjdGlvbi5vbmNvbXBsZXRlID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKCk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGlkYlRyYW5zYWN0aW9uLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIHJlamVjdChpZGJUcmFuc2FjdGlvbi5lcnJvcik7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGlkYlRyYW5zYWN0aW9uLm9uYWJvcnQgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIHJlamVjdChpZGJUcmFuc2FjdGlvbi5lcnJvcik7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgVHJhbnNhY3Rpb24ucHJvdG90eXBlLm9iamVjdFN0b3JlID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBPYmplY3RTdG9yZSh0aGlzLl90eC5vYmplY3RTdG9yZS5hcHBseSh0aGlzLl90eCwgYXJndW1lbnRzKSk7XHJcbiAgICB9O1xyXG5cclxuICAgIHByb3h5UHJvcGVydGllcyhUcmFuc2FjdGlvbiwgJ190eCcsIFtcclxuICAgICAgICAnb2JqZWN0U3RvcmVOYW1lcycsXHJcbiAgICAgICAgJ21vZGUnXHJcbiAgICBdKTtcclxuXHJcbiAgICBwcm94eU1ldGhvZHMoVHJhbnNhY3Rpb24sICdfdHgnLCBJREJUcmFuc2FjdGlvbiwgW1xyXG4gICAgICAgICdhYm9ydCdcclxuICAgIF0pO1xyXG5cclxuICAgIGZ1bmN0aW9uIFVwZ3JhZGVEQihkYiwgb2xkVmVyc2lvbiwgdHJhbnNhY3Rpb24pIHtcclxuICAgICAgICB0aGlzLl9kYiA9IGRiO1xyXG4gICAgICAgIHRoaXMub2xkVmVyc2lvbiA9IG9sZFZlcnNpb247XHJcbiAgICAgICAgdGhpcy50cmFuc2FjdGlvbiA9IG5ldyBUcmFuc2FjdGlvbih0cmFuc2FjdGlvbik7XHJcbiAgICB9XHJcblxyXG4gICAgVXBncmFkZURCLnByb3RvdHlwZS5jcmVhdGVPYmplY3RTdG9yZSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiBuZXcgT2JqZWN0U3RvcmUodGhpcy5fZGIuY3JlYXRlT2JqZWN0U3RvcmUuYXBwbHkodGhpcy5fZGIsIGFyZ3VtZW50cykpO1xyXG4gICAgfTtcclxuXHJcbiAgICBwcm94eVByb3BlcnRpZXMoVXBncmFkZURCLCAnX2RiJywgW1xyXG4gICAgICAgICduYW1lJyxcclxuICAgICAgICAndmVyc2lvbicsXHJcbiAgICAgICAgJ29iamVjdFN0b3JlTmFtZXMnXHJcbiAgICBdKTtcclxuXHJcbiAgICBwcm94eU1ldGhvZHMoVXBncmFkZURCLCAnX2RiJywgSURCRGF0YWJhc2UsIFtcclxuICAgICAgICAnZGVsZXRlT2JqZWN0U3RvcmUnLFxyXG4gICAgICAgICdjbG9zZSdcclxuICAgIF0pO1xyXG5cclxuICAgIGZ1bmN0aW9uIERCKGRiKSB7XHJcbiAgICAgICAgdGhpcy5fZGIgPSBkYjtcclxuICAgIH1cclxuXHJcbiAgICBEQi5wcm90b3R5cGUudHJhbnNhY3Rpb24gPSBmdW5jdGlvbigpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFRyYW5zYWN0aW9uKHRoaXMuX2RiLnRyYW5zYWN0aW9uLmFwcGx5KHRoaXMuX2RiLCBhcmd1bWVudHMpKTtcclxuICAgIH07XHJcblxyXG4gICAgcHJveHlQcm9wZXJ0aWVzKERCLCAnX2RiJywgW1xyXG4gICAgICAgICduYW1lJyxcclxuICAgICAgICAndmVyc2lvbicsXHJcbiAgICAgICAgJ29iamVjdFN0b3JlTmFtZXMnXHJcbiAgICBdKTtcclxuXHJcbiAgICBwcm94eU1ldGhvZHMoREIsICdfZGInLCBJREJEYXRhYmFzZSwgW1xyXG4gICAgICAgICdjbG9zZSdcclxuICAgIF0pO1xyXG5cclxuICAgIC8vIEFkZCBjdXJzb3IgaXRlcmF0b3JzXHJcbiAgICAvLyBUT0RPOiByZW1vdmUgdGhpcyBvbmNlIGJyb3dzZXJzIGRvIHRoZSByaWdodCB0aGluZyB3aXRoIHByb21pc2VzXHJcbiAgICBbJ29wZW5DdXJzb3InLCAnb3BlbktleUN1cnNvciddLmZvckVhY2goZnVuY3Rpb24oZnVuY05hbWUpIHtcclxuICAgICAgICBbT2JqZWN0U3RvcmUsIEluZGV4XS5mb3JFYWNoKGZ1bmN0aW9uKENvbnN0cnVjdG9yKSB7XHJcbiAgICAgICAgICAgIENvbnN0cnVjdG9yLnByb3RvdHlwZVtmdW5jTmFtZS5yZXBsYWNlKCdvcGVuJywgJ2l0ZXJhdGUnKV0gPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gdG9BcnJheShhcmd1bWVudHMpO1xyXG4gICAgICAgICAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJnc1thcmdzLmxlbmd0aCAtIDFdO1xyXG4gICAgICAgICAgICAgICAgdmFyIG5hdGl2ZU9iamVjdCA9IHRoaXMuX3N0b3JlIHx8IHRoaXMuX2luZGV4O1xyXG4gICAgICAgICAgICAgICAgdmFyIHJlcXVlc3QgPSBuYXRpdmVPYmplY3RbZnVuY05hbWVdLmFwcGx5KG5hdGl2ZU9iamVjdCwgYXJncy5zbGljZSgwLCAtMSkpO1xyXG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXF1ZXN0LnJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gcG9seWZpbGwgZ2V0QWxsXHJcbiAgICBbSW5kZXgsIE9iamVjdFN0b3JlXS5mb3JFYWNoKGZ1bmN0aW9uKENvbnN0cnVjdG9yKSB7XHJcbiAgICAgICAgaWYgKENvbnN0cnVjdG9yLnByb3RvdHlwZS5nZXRBbGwpIHJldHVybjtcclxuICAgICAgICBDb25zdHJ1Y3Rvci5wcm90b3R5cGUuZ2V0QWxsID0gZnVuY3Rpb24ocXVlcnksIGNvdW50KSB7XHJcbiAgICAgICAgICAgIHZhciBpbnN0YW5jZSA9IHRoaXM7XHJcbiAgICAgICAgICAgIHZhciBpdGVtcyA9IFtdO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUpIHtcclxuICAgICAgICAgICAgICAgIGluc3RhbmNlLml0ZXJhdGVDdXJzb3IocXVlcnksIGZ1bmN0aW9uKGN1cnNvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghY3Vyc29yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoaXRlbXMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goY3Vyc29yLnZhbHVlKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvdW50ICE9PSB1bmRlZmluZWQgJiYgaXRlbXMubGVuZ3RoID09IGNvdW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoaXRlbXMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGN1cnNvci5jb250aW51ZSgpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxuXHJcbiAgICB2YXIgZXhwID0ge1xyXG4gICAgICAgIG9wZW46IGZ1bmN0aW9uKG5hbWUsIHZlcnNpb24sIHVwZ3JhZGVDYWxsYmFjaykge1xyXG4gICAgICAgICAgICB2YXIgcCA9IHByb21pc2lmeVJlcXVlc3RDYWxsKGluZGV4ZWREQiwgJ29wZW4nLCBbbmFtZSwgdmVyc2lvbl0pO1xyXG4gICAgICAgICAgICB2YXIgcmVxdWVzdCA9IHAucmVxdWVzdDtcclxuXHJcbiAgICAgICAgICAgIHJlcXVlc3Qub251cGdyYWRlbmVlZGVkID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgIGlmICh1cGdyYWRlQ2FsbGJhY2spIHtcclxuICAgICAgICAgICAgICAgICAgICB1cGdyYWRlQ2FsbGJhY2sobmV3IFVwZ3JhZGVEQihyZXF1ZXN0LnJlc3VsdCwgZXZlbnQub2xkVmVyc2lvbiwgcmVxdWVzdC50cmFuc2FjdGlvbikpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHAudGhlbihmdW5jdGlvbihkYikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBEQihkYik7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZGVsZXRlOiBmdW5jdGlvbihuYW1lKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBwcm9taXNpZnlSZXF1ZXN0Q2FsbChpbmRleGVkREIsICdkZWxldGVEYXRhYmFzZScsIFtuYW1lXSk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGV4cDtcclxuICAgICAgICBtb2R1bGUuZXhwb3J0cy5kZWZhdWx0ID0gbW9kdWxlLmV4cG9ydHM7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBzZWxmLmlkYiA9IGV4cDtcclxuICAgIH1cclxufSgpKTtcclxuIiwibGV0IHJlc3RhdXJhbnQ7XHJcbnZhciBtYXA7XHJcblxyXG4vKipcclxuICogSW5pdGlhbGl6ZSBHb29nbGUgbWFwLCBjYWxsZWQgZnJvbSBIVE1MLlxyXG4gKi9cclxud2luZG93LmluaXRNYXAgPSAoKSA9PiB7XHJcbiAgICBmZXRjaFJlc3RhdXJhbnRGcm9tVVJMKChlcnJvciwgcmVzdGF1cmFudCkgPT4ge1xyXG4gICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICAvLyBHb3QgYW4gZXJyb3IhXHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNlbGYubWFwID0gbmV3IGdvb2dsZS5tYXBzLk1hcChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFwJyksIHtcclxuICAgICAgICAgICAgICAgIHpvb206IDE2LFxyXG4gICAgICAgICAgICAgICAgY2VudGVyOiByZXN0YXVyYW50LmxhdGxuZyxcclxuICAgICAgICAgICAgICAgIHNjcm9sbHdoZWVsOiBmYWxzZSxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGZpbGxCcmVhZGNydW1iKCk7XHJcbiAgICAgICAgICAgIERCSGVscGVyLm1hcE1hcmtlckZvclJlc3RhdXJhbnQoc2VsZi5yZXN0YXVyYW50LCBzZWxmLm1hcCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn07XHJcblxyXG4vKipcclxuICogR2V0IGN1cnJlbnQgcmVzdGF1cmFudCBmcm9tIHBhZ2UgVVJMLlxyXG4gKi9cclxuZmV0Y2hSZXN0YXVyYW50RnJvbVVSTCA9IGNhbGxiYWNrID0+IHtcclxuICAgIGlmIChzZWxmLnJlc3RhdXJhbnQpIHtcclxuICAgICAgICAvLyByZXN0YXVyYW50IGFscmVhZHkgZmV0Y2hlZCFcclxuICAgICAgICBjYWxsYmFjayhudWxsLCBzZWxmLnJlc3RhdXJhbnQpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGNvbnN0IGlkID0gZ2V0UGFyYW1ldGVyQnlOYW1lKCdpZCcpO1xyXG4gICAgaWYgKCFpZCkge1xyXG4gICAgICAgIC8vIG5vIGlkIGZvdW5kIGluIFVSTFxyXG4gICAgICAgIGVycm9yID0gJ05vIHJlc3RhdXJhbnQgaWQgaW4gVVJMJztcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIERCSGVscGVyLmZldGNoUmVzdGF1cmFudEJ5SWQoaWQsIChlcnJvciwgcmVzdGF1cmFudCkgPT4ge1xyXG4gICAgICAgICAgICBzZWxmLnJlc3RhdXJhbnQgPSByZXN0YXVyYW50O1xyXG4gICAgICAgICAgICBpZiAoIXJlc3RhdXJhbnQpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGZpbGxSZXN0YXVyYW50SFRNTCgpO1xyXG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXN0YXVyYW50KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgcmVzdGF1cmFudCBIVE1MIGFuZCBhZGQgaXQgdG8gdGhlIHdlYnBhZ2VcclxuICovXHJcbmZpbGxSZXN0YXVyYW50SFRNTCA9IChyZXN0YXVyYW50ID0gc2VsZi5yZXN0YXVyYW50KSA9PiB7XHJcbiAgICBjb25zdCBuYW1lID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc3RhdXJhbnQtbmFtZScpO1xyXG4gICAgbmFtZS5pbm5lckhUTUwgPSByZXN0YXVyYW50Lm5hbWU7XHJcblxyXG4gICAgY29uc3QgYWRkcmVzcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXN0YXVyYW50LWFkZHJlc3MnKTtcclxuICAgIGFkZHJlc3MuaW5uZXJIVE1MID0gcmVzdGF1cmFudC5hZGRyZXNzO1xyXG5cclxuICAgIGNvbnN0IGltYWdlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc3RhdXJhbnQtaW1nJyk7XHJcbiAgICBpbWFnZS5jbGFzc05hbWUgPSAncmVzdGF1cmFudC1pbWcnO1xyXG4gICAgaW1hZ2UuYWx0ID0gYCR7cmVzdGF1cmFudC5uYW1lfSByZXN0YXVyYW50LCBhZGRyZXNzICR7XHJcbiAgICAgICAgcmVzdGF1cmFudC5hZGRyZXNzXHJcbiAgICB9LCAke3Jlc3RhdXJhbnQuY3Vpc2luZV90eXBlfSBjdWlzaW5lYDtcclxuICAgIGltYWdlLnNyYyA9IERCSGVscGVyLmltYWdlVXJsRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KTtcclxuXHJcbiAgICBjb25zdCBjdWlzaW5lID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc3RhdXJhbnQtY3Vpc2luZScpO1xyXG4gICAgY3Vpc2luZS5pbm5lckhUTUwgPSByZXN0YXVyYW50LmN1aXNpbmVfdHlwZTtcclxuXHJcbiAgICAvLyBmaWxsIG9wZXJhdGluZyBob3Vyc1xyXG4gICAgaWYgKHJlc3RhdXJhbnQub3BlcmF0aW5nX2hvdXJzKSB7XHJcbiAgICAgICAgZmlsbFJlc3RhdXJhbnRIb3Vyc0hUTUwoKTtcclxuICAgIH1cclxuICAgIC8vIGZpbGwgcmV2aWV3c1xyXG4gICAgZmlsbFJldmlld3NIVE1MKCk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ3JlYXRlIHJlc3RhdXJhbnQgb3BlcmF0aW5nIGhvdXJzIEhUTUwgdGFibGUgYW5kIGFkZCBpdCB0byB0aGUgd2VicGFnZS5cclxuICovXHJcbmZpbGxSZXN0YXVyYW50SG91cnNIVE1MID0gKFxyXG4gICAgb3BlcmF0aW5nSG91cnMgPSBzZWxmLnJlc3RhdXJhbnQub3BlcmF0aW5nX2hvdXJzLFxyXG4pID0+IHtcclxuICAgIGNvbnN0IGhvdXJzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc3RhdXJhbnQtaG91cnMnKTtcclxuICAgIGZvciAobGV0IGtleSBpbiBvcGVyYXRpbmdIb3Vycykge1xyXG4gICAgICAgIGNvbnN0IHJvdyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RyJyk7XHJcblxyXG4gICAgICAgIGNvbnN0IGRheSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RkJyk7XHJcbiAgICAgICAgZGF5LmlubmVySFRNTCA9IGtleTtcclxuICAgICAgICByb3cuYXBwZW5kQ2hpbGQoZGF5KTtcclxuXHJcbiAgICAgICAgY29uc3QgdGltZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RkJyk7XHJcbiAgICAgICAgdGltZS5pbm5lckhUTUwgPSBvcGVyYXRpbmdIb3Vyc1trZXldO1xyXG4gICAgICAgIHJvdy5hcHBlbmRDaGlsZCh0aW1lKTtcclxuXHJcbiAgICAgICAgaG91cnMuYXBwZW5kQ2hpbGQocm93KTtcclxuICAgIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgYWxsIHJldmlld3MgSFRNTCBhbmQgYWRkIHRoZW0gdG8gdGhlIHdlYnBhZ2UuXHJcbiAqL1xyXG5maWxsUmV2aWV3c0hUTUwgPSAocmV2aWV3cyA9IHNlbGYucmVzdGF1cmFudC5yZXZpZXdzKSA9PiB7XHJcbiAgICBjb25zdCBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmV2aWV3cy1jb250YWluZXInKTtcclxuICAgIGNvbnN0IHRpdGxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaDMnKTtcclxuICAgIHRpdGxlLmlubmVySFRNTCA9ICdSZXZpZXdzJztcclxuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZCh0aXRsZSk7XHJcblxyXG4gICAgaWYgKCFyZXZpZXdzKSB7XHJcbiAgICAgICAgY29uc3Qgbm9SZXZpZXdzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xyXG4gICAgICAgIG5vUmV2aWV3cy5pbm5lckhUTUwgPSAnTm8gcmV2aWV3cyB5ZXQhJztcclxuICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQobm9SZXZpZXdzKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBjb25zdCB1bCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXZpZXdzLWxpc3QnKTtcclxuICAgIHJldmlld3MuZm9yRWFjaChyZXZpZXcgPT4ge1xyXG4gICAgICAgIHVsLmFwcGVuZENoaWxkKGNyZWF0ZVJldmlld0hUTUwocmV2aWV3KSk7XHJcbiAgICB9KTtcclxuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZCh1bCk7XHJcbn07XHJcbi8qKlxyXG4gKiBBZGQgbmV3IHJldmlldyB0byB0aGUgcmV2aWV3IGxpc3QgYW5kIHVwZGF0ZSBpdFxyXG4gKi9cclxuY29uc3QgdXBkYXRlUmV2aWV3c0hUTUwgPSAocmV2aWV3cyA9IHNlbGYucmVzdGF1cmFudC5yZXZpZXdzKSA9PiB7XHJcbiAgICBjb25zdCB1bCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXZpZXdzLWxpc3QnKTtcclxuICAgIHJldmlld3MuZm9yRWFjaChyZXZpZXcgPT4ge1xyXG4gICAgICAgIHVsLmFwcGVuZENoaWxkKGNyZWF0ZVJldmlld0hUTUwocmV2aWV3KSk7XHJcbiAgICB9KTtcclxufTtcclxuLyoqXHJcbiAqIENyZWF0ZSByZXZpZXcgSFRNTCBhbmQgYWRkIGl0IHRvIHRoZSB3ZWJwYWdlLlxyXG4gKi9cclxuY3JlYXRlUmV2aWV3SFRNTCA9IHJldmlldyA9PiB7XHJcbiAgICBjb25zdCBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XHJcbiAgICBjb25zdCBuYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xyXG4gICAgbmFtZS5pbm5lckhUTUwgPSByZXZpZXcubmFtZTtcclxuICAgIGxpLmFwcGVuZENoaWxkKG5hbWUpO1xyXG5cclxuICAgIGNvbnN0IHJhdGluZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcclxuICAgIHJhdGluZy5pbm5lckhUTUwgPSBgUmF0aW5nOiAke3Jldmlldy5yYXRpbmd9YDtcclxuICAgIGxpLmFwcGVuZENoaWxkKHJhdGluZyk7XHJcblxyXG4gICAgY29uc3QgY29tbWVudHMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XHJcbiAgICBjb21tZW50cy5pbm5lckhUTUwgPSByZXZpZXcuY29tbWVudHM7XHJcbiAgICBsaS5hcHBlbmRDaGlsZChjb21tZW50cyk7XHJcblxyXG4gICAgcmV0dXJuIGxpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFkZCByZXN0YXVyYW50IG5hbWUgdG8gdGhlIGJyZWFkY3J1bWIgbmF2aWdhdGlvbiBtZW51XHJcbiAqL1xyXG5maWxsQnJlYWRjcnVtYiA9IChyZXN0YXVyYW50ID0gc2VsZi5yZXN0YXVyYW50KSA9PiB7XHJcbiAgICBjb25zdCBicmVhZGNydW1iID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JyZWFkY3J1bWInKTtcclxuICAgIGNvbnN0IGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcclxuICAgIC8vIGZvciBhY2Nlc3NpYmlsaXR5XHJcbiAgICBjb25zdCBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xyXG4gICAgYS5ocmVmID0gYHJlc3RhdXJhbnQuaHRtbD9pZD0ke3Jlc3RhdXJhbnQuaWR9YDtcclxuICAgIGEuaW5uZXJIVE1MID0gcmVzdGF1cmFudC5uYW1lO1xyXG4gICAgYS5zZXRBdHRyaWJ1dGUoJ2FyaWEtY3VycmVudCcsICdwYWdlJyk7XHJcbiAgICBsaS5hcHBlbmRDaGlsZChhKTtcclxuICAgIGJyZWFkY3J1bWIuYXBwZW5kQ2hpbGQobGkpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEdldCBhIHBhcmFtZXRlciBieSBuYW1lIGZyb20gcGFnZSBVUkwuXHJcbiAqL1xyXG5nZXRQYXJhbWV0ZXJCeU5hbWUgPSAobmFtZSwgdXJsKSA9PiB7XHJcbiAgICBpZiAoIXVybCkgdXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWY7XHJcbiAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC9bXFxbXFxdXS9nLCAnXFxcXCQmJyk7XHJcbiAgICBjb25zdCByZWdleCA9IG5ldyBSZWdFeHAoYFs/Jl0ke25hbWV9KD0oW14mI10qKXwmfCN8JClgKSxcclxuICAgICAgICByZXN1bHRzID0gcmVnZXguZXhlYyh1cmwpO1xyXG4gICAgaWYgKCFyZXN1bHRzKSByZXR1cm4gbnVsbDtcclxuICAgIGlmICghcmVzdWx0c1syXSkgcmV0dXJuICcnO1xyXG4gICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChyZXN1bHRzWzJdLnJlcGxhY2UoL1xcKy9nLCAnICcpKTtcclxufTtcclxuXHJcbi8vIGFkZCByZXZpZXcgYnV0dG9uXHJcbmNvbnN0IGFkZFJldmlld0J1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhZGRfcmV2aWV3Jyk7XHJcbi8vIHdoZW4gYnV0dG9uIGNsaWNrZWQgaXQgc2hvdWxkIGNoZWNrIHRoZSBmb3JtIGFuZCBhZGQgdGhlIHJldmlld1xyXG5hZGRSZXZpZXdCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcclxuICAgIGxldCBuYW1lID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3VzZXJfbmFtZScpLnZhbHVlO1xyXG4gICAgbGV0IHJhdGluZyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyYXRpbmcnKS52YWx1ZTtcclxuICAgIGxldCBjb21tZW50cyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd1c2VyX2NvbW1lbnQnKS52YWx1ZTtcclxuICAgIGlmKCFuYW1lLnRyaW0oKSB8fCAhcmF0aW5nIHx8ICFjb21tZW50cy50cmltKCkpIHtcclxuICAgICAgICBhbGVydCgncGxlYXNlIGFkZCBjb3JyZWN0IHZhbHVlcyB0aGVuIHN1Ym1pdCBhZ2FpbicpIDtcclxuICAgICAgICByZXR1cm4gO1xyXG4gICAgfVxyXG4gICAgaWYgKHBhcnNlSW50KHJhdGluZyk+NSB8fCBwYXJzZUludChyYXRpbmcpIDwgMCl7XHJcbiAgICAgICAgYWxlcnQoJ3JhdGluZyB2YWx1ZSBzaG93IGJlIGZyb20gMCB0byA1JykgO1xyXG4gICAgICAgIHJldHVybiA7XHJcbiAgICB9XHJcbiAgICBjb25zdCByZXZpZXcgPSB7IG5hbWUsIHJhdGluZywgY29tbWVudHMgfTtcclxuXHJcbiAgICAvLyB1cGRhdGUgdGhlIGxpc3Qgb2YgcmV2aWV3c1xyXG5cclxuICAgIC8vXHJcbiAgICBEQkhlbHBlci5hZGROZXdSZXN0YXVyYW50UmV2aWV3KHNlbGYucmVzdGF1cmFudCwgcmV2aWV3LCAoZXJyLCByZXMpID0+IHtcclxuICAgICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYGVycm9yIHVwZGF0aW5nIHRoZSBzZXJ2ZXIgZGF0YWApO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd1cGRhdGluZyB0aGUgZGF0YSBzdWNjZXNzZnVsbHknKTtcclxuICAgICAgICAgICAgdXBkYXRlUmV2aWV3c0hUTUwoKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufSk7XHJcbi8vIGxpc3RlbiBmb3Igb25saW5lIGV2ZW50IHRvIG1ha2UgdGhlIHVzZXIgb25saW5lXHJcbi8vIHdoZW4gdXNlciBpcyBvbmxpbmUgdXBkYXRlIHRoZSBzZXJ2ZXIgYW5kIERCXHJcbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdvbmxpbmUnLCAoKSA9PiB7XHJcbiAgICBEQkhlbHBlci51cGRhdGVTZXJ2ZXJBbmREQihzZWxmLnJlc3RhdXJhbnQpXHJcbiAgICAgICAgLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZG9uZScpO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLmNhdGNoKGVyciA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcclxuICAgICAgICB9KTtcclxufSk7XHJcbiJdfQ==
