/*globals window*/
var $                     = require('jquery'),
    _                     = require('underscore'),
    Backbone              = require('backbone'),
    BaseController        = require('lib/base_controller'),
    AdminListView         = require('views/admin_list_view'),
    DetailView            = require('views/detail_view'),
    EditView              = require('views/edit_view'),
    FilterView            = require('views/filter_view'),
    IndexView             = require('views/index_view'),
    ListView              = require('views/list_view'),
    AboutView             = require('views/about_view'),
    Query                 = require('lib/query'),
    applicationController = new BaseController({ el: '#linksf' }),
    facilities            = require('collections/facilities').instance,
    parseParams           = require('lib/query_param_parser');


var Router = Backbone.Router.extend({
  routes: {
    '': 'index',
    'list': 'index',
    'query?:queryString': 'query',
    'detail/:id': 'detail',
    'edit/:id': 'edit',
    'about' : 'about',
    'filter': 'filter'
  },

  listView: null,

  listViewClass: ListView,
  initialize: function() {
    this.routesHit = 0;
    //keep count of number of routes handled by your application
    Backbone.history.on('route', function() { this.routesHit++; }, this);
  },
  back: function() {
    if(this.routesHit > 1) {
      //more than one route hit -> user did not land to current page directly
      window.history.back();
    } else {
      //otherwise go to the home page. Use replaceState if available so
      //the navigation doesn't create an extra history entry
      this.navigate('', {trigger:true, replace:true});
    }
  },
  index: function() {
    var indexView = new IndexView();
    return applicationController.render(indexView);
  },

  query: function(queryString) {
    var params        = parseParams(queryString),
        categories    = _.compact((params.categories || '').split(',')),
        demographics  = params.demographics || [],
        search        = decodeURIComponent(params.search || ''),
        listViewClass = this.listViewClass,
        queryParams   = { search: search, limit: 20 },
        filterParams  = {},
        self          = this;

    if (categories.length > 0) {
      filterParams.categories = categories;
    }

    if (demographics.length > 0) {
      filterParams.age = demographics;
    }

    if(params.gender) {
      filterParams.gender = params.gender;
    }

    if(params.sort) {
      queryParams.sort = params.sort;
    }

    queryParams.filter = filterParams;

    this.listView = self.listView || new listViewClass({ collection: facilities, isSingleton: true });

    this.listView.performQuery(queryParams).done(function(results) {
      self.listView.reset();
      self.listView.options.categories = categories;
      self.listView.offset = results.offset;
      applicationController.render(self.listView);
      window.scrollTo(0, 0); // Scroll to top
    });
  },

  list: function() {
    var listView = this.listView || new this.listViewClass({collection: facilities});
    listView.collection = facilities;
    listView.searchParams = $('.query form').serializeObject();

    applicationController.render(listView);

    // run a default query
    if ( facilities.length === 0 ) {
      listView.submitQuery();
    }
  },

  filter: function() {
    this.filterView = this.filterView || new FilterView();
    this.filterView.render();
  },

  renderFacility: function(facility) {
    var detailView = new DetailView({ model: facility.presentJSON() });
    window.scrollTo(0, 0); // Scroll to top
    return applicationController.render(detailView);
  },

  renderEdit: function(facility) {
    var editView = new EditView({ model: facility });
    return applicationController.render(editView);
  },

  detail: function(id) {
    this._getFacility(id, function(facility) {
      this.renderFacility(facility);
    }.bind(this));
  },

  edit: function(id) {
    this._getFacility(id, function(fac) {
      this.renderEdit(fac);
    }.bind(this));
  },
  about: function() {
    this.aboutView = this.aboutView || new AboutView();
    this.aboutView.render();
  },

  _getFacility: function(id, done) {
    var facility = facilities.get(id);

    if ( !facility ) {
      //Fetch Facility from backend if not in collection
      Query.getByID(id).then(function(facility) {
        done(facility);
      });
    } else {
      done(facility);
    }
  }
});

var instance = new Router();
module.exports = { instance: instance };
