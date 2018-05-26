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
});
/*
    register service worker function
 */
const registerServiceWorker = () => {
    /* if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').then(reg => {
            console.log('successful register the service worker');
        });
    }*/
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
