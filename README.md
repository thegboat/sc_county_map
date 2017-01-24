# SC County Map : interactive jquery ui map widget

[see a live demo]

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

 **font** defaults to 'News Cycle'

 Font for county labels. News Cycle is packaged.  See [Cufon] for how to create new fonts.

Group Options
-
**Groups allow for dividing the map into colors and specifying whether the group is clickable.**

 **members** defaults to null

 Add counties to the members group. Use comma separated county names or translation table ids

 **selected** defaults to null

 Add counties to the selected group. Use comma separated county names or translation table ids

 **clickable** defaults to 'members'

Any group or groups separated by commas is valid. Use 'all' to make all groups clickable.

Color Options
-
**Comma separated CSS valid colors. The second value is color for hover.  If no second value is supplied hover will be ignored.**

 **fill** defaults to "#F8F8F8, #AEAEAE"

 Default color for counties.  The color used for counties not in a group.

 **highlighted** defaults to '#4C7ABF'

 Color used for selected counties. Even if second value is supplied selection does not respond to hover.

 **member** defaults to '#B7DFE5,#4CAEBF'

 Colors used for member counties.

 **edge** defaults to #000

 Color for county lines.

Selector Options
-

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

**preselect** defaults to true

When set to true DOM tranversal is done only once and the result is stored on creation. When false the DOM is tranverse on every operation.  Though you would unlikely notice the performance difference the former is optimal.  Set to false only when necessary.

Custom Group Options
-

Add custom groups by adding group and color prefixes to the name.  The options

`{'group-best' : 'greenwood', 'color-best' : 'red,blue', clickable: 'best'}`

or

`<div id="county_map" data-group-best="greenwood" data-color-best="red,blue" data-clickable="best"/>`

would create the 'best' group with a default color of 'red' and hover color of 'blue'. The 'best' group is clickable

Public Methods
-

**paint** paint(counties, color)

Calling the paint method will paint the supplied counties. When an event is triggered, all previously painted counties are unpainted.

`$("#county_map").sc_county_map('paint', 'union,york', 'blue')`

**unpaint** unpaint([counties])

All painting is undone by using the method

`$("#county_map").sc_county_map('unpaint', 'union,york')`

Calling upaint with no arguments unpaints all previously painted counties.

**label** label(text)

Set the header text.  When an event is triggered, the header text is reset.

**add_to** add_to(group_name, options)

Method to create new group, change group members, colors.

`$("#county_map").sc_county_map('add_to', 'new_group', {clickable : false, colors:'red,cyan', shapes:'horry,berkeley'})`

**remove_from** remove_from(group_name, [counties])

Remove the specified counties form the group. If no couty is specified all counties are removed


[raphael]: http://raphaeljs.com/
[see a live demo]: http://rawgithub.com/thegboat/examples/master/sc_county_map/example.html
[Cufon]: http://cufon.shoqolate.com/generate/
