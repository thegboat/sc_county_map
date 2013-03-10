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

Simple Usage
-

    $("#county_map").sc_county_map();


More complex example
-

####HTML

    <div id="county_map_wrapper">
        <div class="county_map_info"></div>
        <div id="county_map"></div>
        <div class="county_map_info_greenville" style="display:none;"> Some information about Greenville </div>
            ...
    </div>
    <input id="county_map_greenville" type="radio" value="1" />
     ...
    
    
####JavaScript

    $(document).ready(function(){
      $("#county_map").sc_county_map({
        members : 'greenville,spartanburg,anderson,greenwood',
        selected : 'greenwood',
        scale : 0.6,
        infoselector : '#county_map_wrapper .county_map_info',
        formselector : '#county_map_|shape_id|'
      });
    });

![ScreenShot](https://rawgithub.com/thegboat/examples/master/sc_county_map/screen_shot.png)

HTML attributes instead of options
-

####HTML

    <div class="county_map_info" data-members="union,chester" data-clickable="all" data-scale="0.6" />


Map Options
-

 **translation-table** defaults to null

 A json object mapping a server side id with a county name. All counties must be mapped.  When the translation table is given the server side id or the county name can be substituted in any fashion.  The map is packaged with a translation table ordered alphabetically where Abbeville is 1 and York is 46.

 **scale** defaults to 1.0

 Map size is 865x765 pixels. Use this option to scale map up  or down

 **multiselect** defaults to false

 Specifies how many counties can be selected. true and false are valid values

Group Options
-
**Groups allow for dividing the map into colors and specifying whether the group is clickable.**

 **members** defaults to null

 Add counties to the members group. Use comma separated county names or translation table ids

 **selected** defaults to null

 Add counties to the selected group. Use comma separated county names or translation table ids

 **clickable** defaults to members

 'members', 'nonmembers', and 'all' are valid values.

Color Options
-

 **fill** defaults to #F8F8F8

 Default color for counties.  The color used for counties not in a group.

 **highlighted** defaults to #4C7ABF

 Color used for selected counties.

 **member** defaults to #B7DFE5

 Color used for member counties.

 **hover** defaults to #AEAEAE

 Default color for hovering.

 **memberhover** defaults to #4CAEBF

 Color for member hovering.

 **edge** defaults to #000

 Color for county lines.

Selector Options
-
**The selectors are used at creation time and the element is stored with the county.  The DOM tranversal is done only once therefore the selection is not dynamic.**

**formselector** defaults to null

Use this option to enable the map to be used as a form control.  The logic implies you are using the same naming convention for all county inputs and the input is either type radio or checkbox.  Use the token |shape_id| in place of the actual identier in the selector.  

`input[name='client[counties][]'][value='|shape_id|']`

Shape id will correspond both to the county name and the translation table id if it is given.  The selector is used at creation time and the element is stored with the county.  The DOM tranversal is done only once therefore the selection is not dynamic.

**infoselector** defaults to null

Use this option to display information by county.  When a county is clicked the selector is used as a prefix to a div corresponding to the county. The html in the county's div is then displayed in a div matching the selector exactly.  Using:

`#county_map_wrapper .county_map_info`

when greenville is clicked the selector 

`#county_map_wrapper .county_map_info_greenville` 

will be used to find the html to replace with.  If a translation table is provided and greenville was mapped to 23 

`#county_map_wrapper .county_map_info_greenville, #county_map_wrapper .county_map_info_23`

would be used.  


[raphael]: http://raphaeljs.com/