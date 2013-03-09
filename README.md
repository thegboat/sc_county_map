# SC County Map : interactive jquery ui map widget

Dependencies
-

* jquery
* jquery ui
* [raphael]

Features
-

* Information display
* Radio button like form behavior
* Checkbox form behavior
* Configurable colors
* Options can be set using HTML attributes

####HTML

    <div id="county_map"></div>
    
    
####JavaScript

    $(document).ready(function(){
      $("#county_map").sc_county_map();
    });

Options
-

####HTML
    <div id="county_map_wrapper">
        <div class="county_map_info"></div>
        <div id="county_map"></div>
        <div class="county_map_info_greenville" style="display:none;"></div>
            ...
    </div>
    <input id="county_map_greenville" type="radio" value="1" />
     ...

####JavaScript

    $(document).ready(function(){
      $("#county_map").sc_county_map({
        // json object mapping a serverside id with a county name i.e. {1:'greenville', ...}
       'translation-table' : null,
        // map size is 865x765 use this option to scale map
        scale: 1.0,
        // add to members group ... if you have translation table given the ids can be used 
        members: 'greenville,spartanburg',
        // the color to use when a county is part of no group 
       'default' : "#F8F8F8",
        // the color to use when the county is part of the selected group 
        highlighted  : "#4C7ABF",
        // the color to use when the county is part of the member group
        member    : "#B7DFE5",
        // the color to use on hover 
        hover     : "#AEAEAE",
        // the color to use on hover of a county in the member group 
        memberhover : "#4CAEBF",
        // color to use for county lines
        edge : "#000",
        // add to selected group ... if you have translation table given the ids can be used
        selected : 'greenville',
        // cufon font to use for labels ... News Cycle is packaged
        font : "News Cycle",
        // what counties can be selected; valid values members, nonmembers, all
        clickable :  'members',
        // how many counties can be selected ... when used as form input equivalent to radio or checkbox
        multiselect : true,
        // jquery selector to match form input the correct county
        //clicking greenville  will control $("#county_map_greenville")
        //if translation table given both name and id will work.
        formselector : '#county_map_|shape_id|', 
        // jquery selector to show information when a county is clicked.
        // this example would call $('#county_map_wrapper .county_map_info').html($('#county_map_wrapper .county_map_info_greenville').html()) if greenville is clicked. 
        //if translation table given both name and id will work.
        infoselector : '#county_map_wrapper .county_map_info' 
      });
    });


[raphael]: http://raphaeljs.com/