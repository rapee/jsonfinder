/*
 * CHROME EXTENSION
 */

/* JSON Finder Chrome Extension */
(function() {

  var rawjson;

  // bootstrap on page ready
  document.addEventListener("DOMContentLoaded", domready, false);

  function domready() {
    var pre;
    if (document.body && document.body.childNodes[0] && document.body.childNodes[0].tagName == "PRE") {
      pre = document.body.childNodes[0];
      try {
        // parse json
        rawtext = pre.innerText;
        json = JSON.parse(rawtext);
        rawjson = json;
        // remove old pre
        document.body.removeChild(pre);
      } catch(e) {
        console.error(e);
        return;
      }
      // start JSON view mode
      bootstrap();
    }
  }

  function loadInternalResource(names, callback) {
    var _resourcesCount = 0;
    if (typeof names === 'string') names = [names];
    names.forEach(function(name) {
      _resourcesCount++;
      _loadInternalResource(name, onload);
    });

    function onload() {
      _resourcesCount--;
      if (_resourcesCount === 0) {
        callback();
      }
    }
    function _loadInternalResource(name, callback) {
      var comp = name.split('.');
      if (comp.length === 0) {
        console.error('invalid resource name: '+name);
        return false;
      }
      var ext = comp[comp.length-1];
      var e;
      switch (ext) {
        case 'html':
          if (jQuery) {
            jQuery.get(chrome.extension.getURL('/'+name))
            .done(function(data, textstatus, jqxhr) {
              $('body').append($(data));
            })
            .always(function() {
              callback();
            });
          } else {
            console.warn('required jQuery for ajax');
          }
          break;
        case 'js':
          e = document.createElement("script");
          e.type = "text/javascript";
          e.src = chrome.extension.getURL('/'+name);
          document.head.appendChild(e);
          onready(e);
          break;
        case 'css':
          var e = document.createElement('link');
          e.rel = 'stylesheet';
          e.type = 'text/css';
          e.href = chrome.extension.getURL('/'+name);
          document.head.appendChild(e);
          onready(e);
          break;
        default:
          console.debug('unknown resource extension: '+name);
          break;
      }
      function onready(e) {
        if (e) {
          e.onreadystatechange = e.onload = function() {
            // if (name.indexOf('.html')>=0) { debugger; }
            var state = e.readyState;
            if (!state || /loaded|complete/.test(state)) {
              callback();
            }
          };
        }
      }
      return true;
    }
  }

  function bootstrap() {
    // load resources
    var resources = [
      'style.css',
      'jquery.js',
      'underscore.js',
      'backbone.js',
      'template.html'
    ];
    loadInternalResource(resources, function() {

      // start app
      var app = createApplication(jQuery, Backbone, _);
      app.start(rawjson);

    });

  }


  function createApplication($, Backbone, _) {

    var JSONModel = Backbone.Model.extend({

      defaults: function() {
        return {
          // rawstring: null,
          data: {},
          paths: [],
          focused: null,
          selected: null,
          order: 0
        };
      },

      rawstring: null,

      validate: function(attrs, options) {
        if (attrs.data) {
          if (typeof attrs.data === 'string') {
            try {
              var json = JSON.parse(attrs.data);
              this.rawstring = attrs.data;
              attrs.data = json;
            } catch(e) {
              return "cannot parse JSON";
            }
          }
        }
        if (attrs.rawstring) {
          return 'rawstring is read-only';
        }
      }

    });



    var JSONStackCollection = Backbone.Collection.extend({

      model: JSONModel,

      initialize: function() {
        this.on('add', function(model, collection, options) {
          model.set('order', this.nextOrder()-1);
        });
      },

      nextOrder: function() {
        if (!this.length) return 1;
        return this.length + 1;
      }

    });



    var DocumentView = Backbone.View.extend({
      el: document,

      events: {
        'keydown': 'keydown'
      },

      keydown: function(e) {
        var router = this.model.get('router');
        var stack = this.model.get('stack');
        var paths = this.model.get('paths');

        switch(e.keyCode) {
          case 70: // F
            if (e.metaKey) {
              e.preventDefault();
              // stop browser default Find shortcut key
              var searchbar = this.model.get('views').searchbar;
              if (searchbar.$el.css('display') === 'none') {
                searchbar.$el.slideDown(100);
                searchbar.$input.trigger('select');
              } else {
                searchbar.$input.trigger('select');
              }
            }
            break;
          case 27: // escape
            // var toolbar = this.$el;
            var searchbar = this.model.get('views').searchbar;
            if (searchbar.$el.css('display')!=='none') {
              e.stopPropagation();
              searchbar.$el.slideUp(150, function() {
                searchbar.$input.trigger('blur');
              });
              // hide highlight
              this.model.highlightKeyword(null, null);
            }
            break;
          case 39: // arrow right
            // On OSX: Option+ARROW_RIGHT = Go next
            // We want to keep this default behavior
            if (!e.metaKey) {
              e.stopPropagation();
              var data = stack.last().get('data');
              var keys = Object.keys(data);
              if (keys.length > 0) {
                var paths = paths.concat(keys[0]);
                router.navigate(paths.join('/'), {trigger: true});
              }
            }
            break;
          case 37: // arrow left
          // case 27: // escape
          // case 8: // backspace

            // On OSX: Option+ARROW_LEFT = Go back
            // We want to keep this default behavior
            if (!e.metaKey) {
              e.stopPropagation();
              router.navigate(paths.slice(0, paths.length-1).join('/'), {trigger: true});
            }
            break;
          case 38: // arrow up
            e.stopPropagation();

            var currentIndex = paths.length-1;
            if (currentIndex >= 0) {
              var data = stack.at(currentIndex).get('data');
              var keys = Object.keys(data);
              var key = paths[currentIndex];
              var next = keys.indexOf(key)-1;
              if (next >= 0) {
                var paths = paths.slice(0, currentIndex).concat(keys[next]);
                router.navigate(paths.join('/'), {trigger: true});
              }
            }
            break;
          case 40: // arrow down
            e.stopPropagation();
            e.preventDefault();

            var currentIndex = paths.length-1;
            if (currentIndex >= 0) {
              var data = stack.at(currentIndex).get('data');
              var keys = Object.keys(data);
              var key = paths[currentIndex];
              var next = keys.indexOf(key)+1;
              if (next < keys.length) {
                var paths = paths.slice(0, currentIndex).concat(keys[next]);
                router.navigate(paths.join('/'), {trigger: true});
              }
            } else {
              var data = stack.first().get('data');
              var keys = Object.keys(data);
              if (keys.length > 0) {
                router.navigate(keys[0], {trigger: true});
              }
            }
            break;
        }
      }

    });



    var PathBarView = Backbone.View.extend({

      id: 'path-bar',

      className: 'toolbar',

      template: _.template($('#template-path-bar').html()),

      itemTemplate: _.template($('#template-path-bar-item').html()),

      events: {
        'mouseenter .breadcrumb-item': 'hoverIn',
        'mouseleave .breadcrumb-item': 'hoverOut'
      },

      initialize: function() {
        this.render();
        // listeners
        this.listenTo(this.model, 'change:paths', this.render);
      },

      render: function() {
        var self = this;
        this.$el.html(this.template());
        if ($('#'+this.id).length === 0) {
          $('#json-finder-app').append(this.el);
        }

        var content = $('');
        var paths = this.model.get('paths');

        content = content.add($(this.itemTemplate({ key: 'root', root: true, selected: paths.length === 0 })));
        paths.forEach(function(name, i) {
          if (i === paths.length-1) {
            content = content.add($(self.itemTemplate({ key: name, path: paths.slice(0, i+1).join('/'), selected: true })));
          } else {
            content = content.add($(self.itemTemplate({ key: name, path: paths.slice(0, i+1).join('/') })));
          }
        });
        this.$el.find('.breadcrumb-list').append(content);
      },

      updatePath: function(model, value, options) {
        this.render();
      },

      hoverIn: function(e) {
        $(e.currentTarget).addClass('hover');
      },

      hoverOut: function(e) {
        $(e.currentTarget).removeClass('hover');
      }

    });



    var SearchBarView = Backbone.View.extend({

      id: 'search-bar',

      className: 'toolbar hideout-toolbar',

      template: _.template($('#template-search-bar').html()),

      events: {
        'keydown': 'onkeydown',
        'blur input[name="searchbox"]': 'resetSearch'
      },

      initialize: function() {
        this.render();
        this.resetSearch();
      },

      render: function() {
        var self = this;
        this.$el
          .html(this.template())
          .hide();
        this.$input = this.$('input[name="searchbox"]');
        if ($('#'+this.id).length === 0) {
          $('#json-finder-app').append(this.el);
        }
      },

      onkeydown: function(e) {
        switch (e.keyCode) {
          case 70: // F
            if (e.metaKey) {
              e.stopPropagation();
              e.preventDefault();
              this.$input.trigger('select');
            }
            break;
          // case 27: // escape
          //   // var toolbar = this.$el;
          //   if (this.$el.css('display')!=='none') {
          //     e.stopPropagation();
          //     // this.deregister();
          //     this.$input.trigger('blur');
          //     this.$el.slideUp(150);
          //   }
          //   break;
          case 13: // enter
            e.stopPropagation();
            this.searchNext(e.shiftKey ?-1:1);
            break;
        }
      },

      searchNext: function(dir) {
        var router = this.model.get('router');
        var dir = dir || 1; // +1 next, -1 previous
        var json = this.model.get('stack').first().get('data') || {};
        var keyword = this.$input.val();
        this.$input.select();

        if (keyword == '') return;

        if (this.current_keyword !== keyword) {
          // new search
          this.current_keyword = keyword;
          this.current_search_results = this.searchJSON(keyword, json);
          this.current_search_index = 0;
        } else if (this.current_search_results.length > 0) {
          // next match
          this.current_search_index = (this.current_search_index+dir);
          if (this.current_search_index >= 0) this.current_search_index = this.current_search_index % this.current_search_results.length;
          else this.current_search_index = this.current_search_results.length-1;
        } else {
          // no match
          this.resetSearch();
        }
        // show match
        if (this.current_search_results.length > 0) {
          $('.search-status').text((this.current_search_index+1) + ' of ' + this.current_search_results.length);

          var location = this.current_search_results[this.current_search_index];
          var paths = location[0].split('/');
          var isValue = !!location[1];
          var match_pos = location[2];

          // update hash
          router.navigate(paths.join('/'), {trigger: true});
          // make highlight
          this.model.highlightKeyword(keyword, paths, isValue, match_pos);
        } else {
          $('.search-status').text('0 of 0');
        }
      },

      resetSearch: function() {
        this.current_keyword = null;
        this.current_search_index = null;
        this.current_search_results = null;
        $('.search-status').text('');
      },

      searchJSON: function(keyword, json) {
        // must not contain cyclic link e.g. reference to item in this tree
        var results = [];
        var q = [];
        shallowPush(json, "", q);
        while (q.length > 0) {
          var pos;
          var item = q.shift();
          var key = item[0];
          var value = item[1];
          var path = item[2];

          switch (typeof value) {
          // case 'boolean':
          //  break;
          // case 'number':
          //  break;
          // case 'string':
          //  break;
          // case 'function':
          //  break;
          case 'object':
            if (value !== null) {
              shallowPushBefore(value, path, q);
            }
            break;
          default:
          }

          // match key
          if (key) {
            addMatch(key, keyword, 0, results);
          }
          // match value
          if (['boolean', 'number', 'string'].indexOf(typeof value) >= 0) {
            addMatch(value.toString(), keyword, 1, results);
          }
        }

        function addMatch(str, keyword, isValue, results) {
          var fromIndex = 0;
          var pos;
          do {
            pos = str.indexOf(keyword, fromIndex);
            if (pos >= 0) {
              results.push([ path, isValue, pos ]);
              fromIndex = pos+1;
            }
          } while (pos >= 0);
        }

        function shallowPush(obj, path, q) { return shallowAdd(obj, path, q, 'push'); }
        function shallowPushBefore(obj, path, q) { return shallowAdd(obj, path, q, 'unshift'); }
        function shallowAdd(obj, path, q, verb) {
          var verb = verb || 'push';
          var prefix = path ? path+'/':'';
          var itemlist = [];
          if (Array.isArray(obj)) {
            obj.forEach(function(val, key) {
              itemlist.push([ key.toString(), val, prefix+key ]);
            });
          } else {
            Object.keys(obj).forEach(function(key) {
              itemlist.push([ key, obj[key], prefix+key ]);
            });
          }
          q[verb].apply(q, itemlist);
        }
        return results;
      }

    });



    var FolderPaneView = Backbone.View.extend({

      className: 'folder-view',

      template: _.template($('#template-folder-pane').html()),

      itemTemplate: _.template($('#template-folder-item').html()),

      events: {
        'click .folder-item': 'selectItem'
      },

      initialize: function(options) {
        this.parent = options.parent;

        this.listenTo(this.model, 'change:data', this.render);
        this.listenTo(this.model, 'change:selected', this.updateSelected);
        this.listenTo(this.model, 'change:highlight', this.updateHighlight);
        this.listenTo(this.model, 'destroy', this.remove);
      },

      updateSelected: function(model, value, options) {
        var selected = value || this.model.get('selected');
        if (!selected) {
          this.$el.find('.folder-item').removeClass('selected focus');
        } else {
          this.$el.find('[data-key="'+selected+'"]')
            .addClass('selected')
            .siblings().removeClass('selected');

          this.updateFocused(true);
        }
      },

      updateFocused: function(focused) {
        if (focused) {
          this.$('.folder-item.selected').addClass('focus')
            .siblings().removeClass('focus');
        } else {
          this.$('.folder-item').removeClass('focus');
        }
        if (this.parent) this.parent.updateFocused();
      },

      render: function() {
        var self = this;
        var order = this.model.get('order');
        var data = this.model.get('data');
        var paths = this.model.get('paths');

        this.$el.html(this.template());
        this.$el.addClass('folder-view-'+order);
        var $list = this.$el.find('.folder-item-list');
        // item list
        _.each(data, function(value, key) {
          var item = $(self.itemTemplate());
          var item_key = item.find('.json-keyname');
          var item_value = item.find('.json-value');

          item.attr('data-key', key);
          if (key === paths[paths.length-1]) item.addClass('focus');
          item.data('value', value);
          item.data('paths', paths.concat(key));

          // item_key.text(key);
          item_key.html('<span>' + key + '</span>');

          switch (typeof value) {
          case 'boolean':
            item_value
              .attr('title', value)
              .addClass('datatype-boolean')
              .html('<span>' + value + '</span>');
            break;
          case 'number':
            item_value
              .attr('title', value)
              .addClass('datatype-number')
              .html('<span>' + value + '</span>');
            break;
          case 'string':
            item_value
              .attr('title', value)
              .addClass('datatype-string')
              .html('<span>' + value + '</span>');
            break;
          case 'function':
            item_value
              .attr('title', value.toString())
              .addClass('datatype-function')
              .html('<span>' + value.toString() + '</span>');
            break;
          case 'object':
            // array or object
            if (value === null) {
              item_value
              .attr('title', 'null')
              .addClass('datatype-null')
              .html('<span></span>');
            } else if (Array.isArray(value)) {
              item_value
              .attr('title', 'Array')
              .addClass('datatype-array')
              .html('<span>Array (' + value.length + ')</span>');
            } else {
              item_value
              .attr('title', 'Object')
              .addClass('datatype-object')
              .html('<span>Object</span>');
            }
            break;
          default:
            item_value.text('unknown type');
          }
          $list.append(item);
        });
        this.updateSelected();

        // resize column
        var resizer = this.$el.find('.resize-handler');
        var _origin_w;
        resizer
        .on('dragstart', function(e, dd) {
          _origin_w = self.$el.width();
        })
        .on('drag', function(e, dd) {
          self.$el.css({ width: Math.max(0, _origin_w+dd.deltaX)+'px' });
        });
        return this;
      },

      selectItem: function(e) {
        var item = e.currentTarget;
        // update hash
        var paths = $(item).data('paths');
        // redirect
        Backbone.Router.prototype.navigate(paths.join('/'), {trigger: true});
      },

      updateHighlight: function(model, value, options) {//keyword, keyname, isValue, pos) {
        var keyword = value.keyword;
        var keyname = value.keyname;
        var isValue = value.isValue;
        var pos = value.pos;
        // reset to normal text when keyword is undefined
        if (value && keyname && !keyword) {
          var $item = this.$el.find('[data-key="'+keyname+'"]');
          var $key = $item.find('.json-keyname');
          $key.text($item.attr('data-key'));
          var $value = $item.find('.json-value');
          $value.text($value.attr('title'));
          return;
        }

        // make text highlighted
        var $field;
        var $item = this.$el.find('[data-key="'+keyname+'"]');
        if (isValue) {
          $field = $item.find('.json-value');
        } else {
          $field = $item.find('.json-keyname');
        }
        var text = $field.text();
        var str1 = text.substr(0, pos);
        var str2 = text.substr(pos, keyword.length);
        var str3 = text.substr(pos+keyword.length);
        $field
          .empty()
          .append(str1)
          .append($('<span class="keyword-match"/>').text(str2))
          .append(str3);
      }

    });



    var AppView = Backbone.View.extend({

      id: 'json-finder-app',

      template: _.template($('#template-app-window').html()),

      initialize: function() {
        this.render();
        this.$wrapper = this.$el.find('.wrapper');

        // listeners
        var stack = this.model.get('stack');
        this.listenTo(stack, 'add', this.addPane);
        this.listenTo(stack, 'remove', this.removePane);
        this.listenTo(stack, 'reset', this.remove);
        this.listenTo(stack, 'destroy', this.remove);
      },

      render: function() {
        this.$el.html(this.template());
        if ($('#'+this.id).length === 0) {
          $('body').append(this.el);
        }
      },

      addPane: function(model, collection, options) {
        var parent = collection.at(collection.length-2);
        var view = new FolderPaneView({ model: model, parent: parent && parent.view });
        model.view = view;
        this.$wrapper.append(view.render().el);
        this.scrollToSelected();
      },

      removePane: function(model, collection, options) {
        this.$wrapper.find('.folder-view-'+model.get('order')).remove();
        delete model.view;
      },

      scrollToSelected: function() {
        var $item = this.$wrapper.children('.folder-view:eq(-1)');
        this.$wrapper[0].scrollLeft = Math.max(0, ($item.position().left+$item.outerWidth()*4)-$(window).outerWidth());//$item.offset().left;
      }

    });



    var AppRouter = Backbone.Router.extend({

      routes: {
        '*paths': 'default'
      },

      default: function(paths) {
        Application.openPath(paths);
      }

    });

    var AppModel = Backbone.Model.extend({

      defaults: function() {
        return {
          views: {},
          router: new AppRouter,
          // ---- data ----
          stack: new JSONStackCollection,
          paths: []
        };
      },

      initialize: function() {
        // init views
        var views = {
          document: new DocumentView({ model: this }),
          main: new AppView({ model: this }),
          pathbar: new PathBarView({ model: this }),
          searchbar: new SearchBarView({ model: this })
        };
        this.set('views', views);

        // listeners
        this.listenTo(this, 'change:json', this.jsonChanged);
      },

      jsonChanged: function(model, value, options) {
        this.set('paths', []);
        this.get('stack').add(new JSONModel({ data: value, paths: [] }, { validate: true }));
        return;
      },

      start: function(data) {
        // set data
        this.set('json', data);
        // start routing
        Backbone.history.start();
      },

      openPath: function(paths) {
        paths = Array.isArray(paths) ? paths : paths ? paths.split('/') : [];
        var select = paths.length > 0 ? paths[paths.length-1] : null;
        var json;
        var _stack = this.get('stack');
        var prevpaths = this.get('paths') || [];
        var prevstack = _stack.length;
        var addpaths, parentpaths;
        var common = 0, remove;
        // get previous path
        for (var i=0; i<paths.length; i++) {
          if (paths[i] === prevpaths[i]) {
            common++;
          } else {
            break;
          }
        }
        if (common >= paths.length) {
          common = paths.length-1;
        }
        // remove panes
        remove = prevstack - common - 1;
        remove = _stack.length-remove>0 ? remove : _stack.length-1;
        for (i=remove; i>0; i--) {
          _stack.remove(_stack.last());
        }
        // update common parent selection
        if (_stack.length > 0) {
          json = _stack.last().get('data');
          _stack.last().set('selected', null); // force trigger change:selected
          _stack.last().set('selected', paths[common]);
        }

        // add panes
        parentpaths = paths.slice(0, common);
        addpaths = paths.slice(common);
        for (i=0; i<addpaths.length; i++) {
          json = json[addpaths[i]];
          parentpaths.push(addpaths[i]);
          // stop if not object or array
          if (typeof json !== 'object') {
            _stack.add(new JSONModel({ data: {}, paths: parentpaths }, { validate: true }));
            break;
          }
          _stack.add(new JSONModel({ data: json, paths: parentpaths, selected: addpaths[i+1] }, { validate: true }));
        }
        // save new path
        this.set('paths', paths);
      },

      highlightKeyword: function(keyword, paths, isValue, pos) {
        var folder;
        var prev = this.get('highlight');
        if (prev) {
          // reset previous highlight, if any
          folder = this.get('stack').at(prev[1].length-1);
          if (folder) {
            folder.set('highlight', {
              keyname: prev[1][prev[1].length-1]
            });
          }
        }
        // make highlight
        if (keyword && paths) {
          this.set('highlight', arguments);
          folder = this.get('stack').at(paths.length-1)
          if (folder) {
            folder.set('highlight', {
              keyword: keyword,
              keyname: paths[paths.length-1],
              isValue: isValue,
              pos: pos
            });
          }
        }
      }

    });

    var Application = new AppModel;

    return Application;
  }

})();
