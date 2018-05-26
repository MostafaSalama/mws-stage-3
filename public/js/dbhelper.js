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
