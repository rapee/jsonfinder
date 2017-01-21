# JSON Finder

Browse JSON like you do it in Finder.

* View like you browse file system.
* Good for large JSON: column view helps you keep track of deep object or array.
* Find in JSON and jump to matches. (Press ⌘+F on OSX)
* Mouse or arrow keys to navigate.
* Support browser back/forward.

# Installation

Install from [Chrom Web Store here](https://www.google.co.jp/url?sa=t&rct=j&q=&esrc=s&source=web&cd=5&cad=rja&ved=0CE8QFjAE&url=https%3A%2F%2Fchrome.google.com%2Fwebstore%2Fdetail%2Fjson-finder%2Fflhdcaebggmmpnnaljiajhihdfconkbj%3Fhl%3Den&ei=_coZUfLNLoSEkgXHw4HQAQ&usg=AFQjCNG-zm83VZeuSmSP_4D2QuA-OYkPJg&sig2=LJBlfEycUhykYqTQ5vrSYw&bvm=bv.42261806,d.dGI).

# Sample JSON

* [http://earthquake.usgs.gov/earthquakes/feed/geojson/all/day](http://earthquake.usgs.gov/earthquakes/feed/geojson/all/day)
* [http://earthquake.usgs.gov/earthquakes/feed/geojson/all/week](http://earthquake.usgs.gov/earthquakes/feed/geojson/all/week)
* [http://earthquake.usgs.gov/earthquakes/feed/geojson/all/month](http://earthquake.usgs.gov/earthquakes/feed/geojson/all/month)

# Change Log

0.1.0

* FIX: Scoped CSS, stop breaking CSS on other sites.

0.0.9

* FIX: Minor bugs fixed

0.0.8

* NEW: Highlight matched keyword when search

0.0.7

* NEW: Migrate codebase to [Backbone.js](https://github.com/documentcloud/backbone) (v1.0.0)

0.0.6

* NEW: Show selected key path
* NEW: Display array length
* NEW: Make column resizable

0.0.5

* FIX: null bug

0.0.4

* NEW: Search key and value in JSON
* NEW: Support history and hash change
* FIX: CSS encoding bug

0.0.3

* FIX: CSS injection bug
