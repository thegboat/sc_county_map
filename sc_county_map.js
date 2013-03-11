/*
 * jQuery UI County Map
 *
 * Author: Grady Griffin
 * Version: 0.2.0
 * 
 * https://github.com/thegboat/sc_county_map
 * 
 * Depends:
 *  jquery.ui.core.js
 *  raphael.js
 */


(function($) {

$.widget("ui.sc_county_map", {
  options: {
    scale: 1.0,
    members: '',
    'fill' : "#F8F8F8,#AEAEAE",
    highlighted  : "#4C7ABF",
    member    : "#B7DFE5,#4CAEBF",
    edge : "#000",
    selected : null,
    font : "News Cycle",
    'translation-table' : null,
    clickable :  'members',
    multiselect : false, // single, multiple
    formselector : null, 
    infoselector : null,
    preselect : true
  },
  /*app specific*/
  //used to map a server side id to entity name
  _translation_table : function(){
    return {"1":"abbeville","2":"aiken","3":"allendale","4":"anderson","5":"bamberg","6":"barnwell","7":"beaufort","8":"berkeley","9":"calhoun","10":"charleston","11":"cherokee","12":"chester","13":"chesterfield","14":"clarendon","15":"colleton","16":"darlington","17":"dillon","18":"dorchester","19":"edgefield","20":"fairfield","21":"florence","22":"georgetown","23":"greenville","24":"greenwood","25":"hampton","26":"horry","27":"jasper","28":"kershaw","29":"lancaster","30":"laurens","31":"lee","32":"lexington","34":"marion","35":"marlboro","33":"mccormick","36":"newberry","37":"oconee","38":"orangeburg","39":"pickens","40":"richland","41":"saluda","42":"spartanburg","43":"sumter","44":"union","45":"williamsburg","46":"york"};
  },

  _create : function(){
    this.options = $.extend(this.options,this.element.data());
    this._info_div(true);
    this.pen = '';

    this.paper = Raphael(this.element[0], this._scaled(865), this._scaled(765));
    if(this.core) this.core.remove();
    this.core = this.paper.set();
    this.header_text = this.paper.text(this._scaled(432), this._scaled(40), '').attr({'font-size' : this._scaled(32)});

    this.translation_table = this.options['translation-table'];
    if(!this.translation_table && this._translation_table){
      this.translation_table = this._translation_table();
    }
    this.translation_table = this.translation_table || {};

    this._set_clickable();
    this._make_groups();
    this._set_colors();
    var to_hlight = this._parse_group('selected');
    this.entities = this._base_entities(true);
    if(to_hlight) this._clicked(this.entities[to_hlight])
    this._draw_counties();

    this.core.toFront();
    this.paper.safari();
  },

  _draw_counties : function(){
    var entity, paths = this._base_paths();
    for(var entity_name in this.entities){
      this._draw_county(entity_name, paths);
    }
  },

  _draw_county : function(entity_name, paths){
    paths = paths || this._base_paths();
    var entity = this.entities[entity_name];
    this.pen = '';
    for(var edge_idx in entity.edges){
      var reverse = /r$/.test(entity.edges[edge_idx]);
      var contained = /z$/.test(entity.edges[edge_idx]);
      var path = paths[parseInt(entity.edges[edge_idx])];

      if(contained) this._write_shape(entity);
      this._stroke_path(path, reverse);

      if(contained) this._write_shape(entity);
    }
    this._write_shape(entity);
    this._add_label(entity);
    this._add_events(entity);
    return this.element;
  },

  _add_label : function(entity){
    var x = this._scaled(entity.text[0]), y = this._scaled(entity.text[1]);
    var r = this.paper.print(x,y, entity.title, this.paper.getFont(this.options.font), this._scaled(16));
    entity.label = r;
    this.core.push(r);
  },

  _add_events : function(entity){
    var map = this;
    var mover = (function(){
      if(!map._is_in_group('selected',entity)){
        var color = map._get_color(entity, true)
        entity.shape.animate({fill: color, stroke: map.colors.edge}, 200);
        map.header_text.attr({text : entity.title});
        map.paper.safari();
      }
    });
    var mout = (function(){
      if(!map._is_in_group('selected',entity)){
        entity.shape.animate({fill: map._get_color(entity), stroke: map.colors.edge}, 200);
        text = map.highlighted ? map.highlighted.title : '';
        map.header_text.attr({text : text});
        map.paper.safari();
      }
    });
    entity.shape.hover(mover,mout);
    entity.label.hover(mover,mout);

    if(map._is_clickable(entity)){
      entity.shape.click(function(){map._clicked(entity)});
      entity.label.click(function(){map._clicked(entity)});
      entity.shape.forEach(function(obj){ $(obj.node).css('cursor', 'pointer') });
      $(entity.label.node).css('cursor', 'pointer');
    }
  },

  _parse_group : function(key){
    var options_data = this.options[key]
    var group_name = key.replace(/^group-/,'')
    var rtn = {}, first = null
    if(options_data){
      var entities = this._base_entities();
      options_data = options_data.split(/[^A-Za-z0-9]/);
      for(i in options_data){
        var member_id =  options_data[i], val = null;
        if(entities[member_id]) val = member_id;
        val = val || this.translation_table[member_id];
        if(val){
          rtn[val] = true;
          if(!first) first = val
          if(key == 'selected' && !this.multiselect) break;
        }
      }
    }
    this.groups[group_name] = rtn;
    return first;
  },

  _set_clickable : function(){
    this.clickable = this.options.clickable.toLowerCase().split(/[^!A-Za-z0-9]/);
    if(this.clickable.indexOf('all') > -1) this.clickable = null;
  },

  _set_colors : function(){
    var hlight = this.options.highlighted.split(',')
    this.colors = {
      fill          : this.options.fill.split(','),
      highlighted   : [hlight[0], hlight[0]],
      members       : this.options.member.split(','),
      edge          : this.options.edge,
    }
    for(var group_name in this.groups){
      if(this.options["color-"+group_name]){
        this.colors[group_name] = this.options["color-"+group_name].split(',')
      }
      else{
        this.colors[group_name] = this.colors[group_name] || this.colors.fill
      }
    }
  },

  _is_in_group : function(group_name, entity){
    if(!this.groups[group_name]) return false
    return !!this.groups[group_name][entity.name]
  },

  _get_group : function(entity){
    if(this._is_in_group('selected', entity)) return 'highlighted'
    if(this._is_in_group('members', entity)) return 'members'
    for(var group_name in this.groups){
      if(this.groups[group_name][entity.name]) return group_name
    }
    return null
  },

  _is_clickable : function(entity){
    if(!this.clickable) return true
    for(var i in this.clickable){
      var group_name = this.clickable[i].replace(/^!/,'');
      if(/^!/.test(this.clickable[i]) ^ this._is_in_group(group_name, entity)){
        return true;
      }
    }
    return false
  },

  _make_groups : function(){
    this.groups = {members : {}}
    for(var group_name in this.options){
      if(/^group-[A-Za-z0-9]/.test(group_name) || group_name == 'members'){
        this._parse_group(group_name)
      }
    }
  },

  _get_color : function(entity, hover){
    group_name = this._get_group(entity)
    if(group_name){
      var l = this.colors[group_name].length
      return (hover ? this.colors[group_name][l-1] : this.colors[group_name][0])
    }
    return (hover ? this.colors.fill[1] : this.colors.fill[0])
  },

  _clicked : function(entity){
    var other = this.highlighted;
    this.highlighted = entity;

    if(this.options.multiselect){
      if(this.highlighted == other){
        this._remove_selected(this.highlighted, true);
      }else{
        this._add_selected(this.highlighted);
      }
    }
    else{
      this._add_selected(this.highlighted);
      if(other != this.highlighted) this._remove_selected(other);
    }
    if(this.highlighted){
      this.header_text.attr({text : this.highlighted.title});
    }
    this._info_div();
    if(this.info_div){
      var info_div = this._get_info_div(entity)
      if(info_div){
        this.info_div.html(info_div.html());
      }
      else{
        this.info_div.empty();
      }
    }
    this.paper.safari();
  },

  _info_div : function(init){
    if(!this.options.infoselector) return null
    if(init || !this.preselect){
      var info_div = $(this.options.infoselector);
      this.info_div = info_div.length ? info_div : null;
    }
  },

  _get_info_div : function(entity, init){
    if(!this.options.infoselector) return null;
    if(init || !entity.info_selector){
      var sel = this.options.infoselector + "_" + entity.name;
      if(entity.id) sel += ", " + this.options.infoselector + "_" + entity.id;
      entity.info_selector = sel;
    }
    if(init || !this.preselect){
      var info_div = $(entity.info_selector);
      if(info_div.length){
        if(this.preselect) entity.info_div = info_div;
        return info_div;
      }
    }else{
      return entity.info_div;
    }
    return null;
  },

  _get_form_input : function(entity, init){
    if(!this.options.formselector) return null;
    if(!entity.form_selector){
      var sel = this.options.formselector.replace(/\|shape_id\|/, entity.name);
      if(entity.id) sel += ", " + this.options.formselector.replace(/\|shape_id\|/, entity.id);
      entity.form_selector = sel;
    }
    if(init || !this.preselect){
      var input = $(entity.form_selector);
      if(input.length){
        if(this.preselect) entity.form_input = input;
        return input;
      }
    }else{
      return entity.form_input;
    }
  },

  _add_selected : function(entity){
    this.groups.selected[entity.name] = true;
    this._change_color(entity)
    if(this._get_form_input(entity)) this._get_form_input(entity).prop('checked', true);
  },

  _remove_selected : function(entity, hovering){
    if(!entity) return false
    this.groups.selected[entity.name] = false;
    this._change_color(entity, hovering)
    if(this._get_form_input(entity)) this._get_form_input(entity).prop('checked', false);
  },

  _change_color : function(entity, hovering){
    var color = this._get_color(entity,hovering)
    if(entity.shape.attr('fill') != color){
      entity.shape.attr({fill: color, stroke: this.colors.edge});
    }
  },

  _stroke_path : function(path,reverse){
    for(var coords in path){
      var idx = reverse ? ((path.length-1) - coords) : coords;
      this.pen += (!this.pen ? 'M' : 'L');
      this.pen += [this._scaled(path[idx][0]),this._scaled(path[idx][1])].join(',');
    }
  },

  _write_shape : function(entity, attrs){
    if(!this.pen || this.pen == 'M') return false ;
    this.pen += 'Z';
    color = this._get_color(entity)
    attrs = attrs || {fill: color, stroke: this.colors.edge, "stroke-width": 1, "stroke-linejoin": "round"};
    entity.shape.push(this.paper.path(this.pen).attr(attrs));
    this.pen = '';
    return true;
  },

  _scaled : function(val){
    return val * this.options.scale;
  },

  _base_entities : function(to_be_stored){
    var entities = {
      "sumter"        : { name : "sumter"      , title : "Sumter"      , text : [504, 333], edges : ["109", "124r", "134", "135r", "115", "136r"]},
      "clarendon"     : { name : "clarendon"   , title : "Clarendon"   , text : [508, 393], edges : ["114", "135", "133", "126", "131", "137r"]},
      "newberry"      : { name : "newberry"    , title : "Newberry"    , text : [288, 264], edges : ["96", "102", "104r", "99r", "119r", "117r", "98"]},
      "bamberg"       : { name : "bamberg"     , title : "Bamberg"     , text : [385, 481], edges : ["54", "128", "76", "71"]},
      "orangeburg"    : { name : "orangeburg"  , title : "Orangeburg"  , text : [418, 437], edges : ["75", "128r", "125r", "127r", "126r", "129", "122", "78"]},
      "calhoun"       : { name : "calhoun"     , title : "Calhoun"     , text : [428, 381], edges : ["121", "129r", "133r", "134r", "123r"]},
      "richland"      : { name : "richland"    , title : "Richland"    , text : [416, 314], edges : ["99", "105", "106r", "124r", "123r", "120r"]},
      "lexington"     : { name : "lexington"   , title : "Lexington"   , text : [337, 334], edges : ["79", "122r", "121r", "120r", "119r", "118"]},
      "saluda"        : { name : "saluda"      , title : "Saluda"      , text : [270, 310], edges : ["80", "118r", "117r", "97r", "83"]},
      "greenwood"     : { name : "greenwood"   , title : "Greenwood"   , text : [191, 290], edges : ["84", "97", "98", "95", "92", "87"]},
      "laurens"       : { name : "laurens"     , title : "Laurens"     , text : [222, 214], edges : ["9", "91", "95r", "96", "94r", "14"]},
      "union"         : { name : "union"       , title : "Union"       , text : [291, 177], edges : ["13", "94", "102", "101r", "100r", "21", "16"]},
      "chester"       : { name : "chester"     , title : "Chester"     , text : [362, 177], edges : ["19", "23r", "103", "100r"]},
      "fairfield"     : { name : "fairfield"   , title : "Fairfield"   , text : [370, 238], edges : ["24", "103", "101", "104r", "105", "107"]},
      "kershaw"       : { name : "kershaw"     , title : "Kershaw"     , text : [463, 241], edges : ["25", "107r", "106r", "109r", "108r", "29"]},
      "lee"           : { name : "lee"         , title : "Lee"         , text : [532, 280], edges : ["108", "136", "116", "110"]},
      "darlington"    : { name : "darlington"  , title : "Darlington"  , text : [564, 246], edges : ["30", "110r", "111r", "33"]},
      "marion"        : { name : "marion"      , title : "Marion"      , text : [671, 275], edges : ["38", "112", "44", "41"]},
      "florence"      : { name : "florence"    , title : "Florence"    , text : [603, 305], edges : ["35", "111", "116r", "115r", "114r", "113r", "112r", "37"]},
      "williamsburg"  : { name : "williamsburg", title : "Williamsburg", text : [592, 394], edges : ["45", "113", "137", "130"]},
      "berkeley"      : { name : "berkeley"    , title : "Berkeley"    , text : [565, 475], edges : ["47", "130r", "131r", "127", "132r", "49"]},
      "dorchester"    : { name : "dorchester"  , title : "Dorchester"  , text : [462, 478], edges : ["50", "132", "125", "53"]},
      "colleton"      : { name : "colleton"    , title : "Colleton"    , text : [444, 540], edges : ["51", "53r", "54r", "55r", "56r", "52r"]},
      "charleston"    : { name : "charleston"  , title : "Charleston"  , text : [534, 565], edges : ["46", "49r", "50r", "51r", "48r"]},
      "georgetown"    : { name : "georgetown"  , title : "Georgetown"  , text : [662, 424], edges : ["42", "44r", "45r", "47r", "46r", "43r"]},
      "horry"         : { name : "horry"       , title : "Horry"       , text : [736, 330], edges : ["39", "41r", "42r", "40r"]},
      "dillon"        : { name : "dillon"      , title : "Dillon"      , text : [672, 230], edges : ["34", "37r", "38r", "39r", "36"]},
      "marlboro"      : { name : "marlboro"    , title : "Marlboro"    , text : [619, 190], edges : ["31", "32", "34", "35", "33"]},
      "chesterfield"  : { name : "chesterfield", title : "Chesterfield", text : [526, 184], edges : ["26", "29r", "30r", "31", "27r"]},
      "lancaster"     : { name : "lancaster"   , title : "Lancaster"   , text : [445, 183], edges : ["20", "22", "26", "25", "24", "23"]},
      "york"          : { name : "york"        , title : "York"        , text : [374, 115], edges : ["17", "21r", "19", "20", "18r"]},
      "cherokee"      : { name : "cherokee"    , title : "Cherokee"    , text : [284, 86 ], edges : ["12", "15", "17", "16"]},
      "spartanburg"   : { name : "spartanburg" , title : "Spartanburg" , text : [214, 130], edges : ["8", "14r", "13r", "12", "11r"]},
      "greenville"    : { name : "greenville"  , title : "Greenville"  , text : [149, 90 ], edges : ["5", "7", "8", "9", "10"]},
      "pickens"       : { name : "pickens"     , title : "Pickens"     , text : [110, 138], edges : ["3", "6", "5", "4r"]},
      "oconee"        : { name : "oconee"      , title : "Oconee"      , text : [41 , 162], edges : ["1", "3", "2"]},
      "anderson"      : { name : "anderson"    , title : "Anderson"    , text : [110, 208], edges : ["2", "93r", "90", "10", "6r"]},
      "abbeville"     : { name : "abbeville"   , title : "Abbeville"   , text : [135, 272], edges : ["88", "92r", "91r", "90r", "89r"]},
      "mccormick"     : { name : "mccormick"   , title : "McCormick"   , text : [148, 330], edges : ["85", "87r", "88r", "86r"]},
      "edgefield"     : { name : "edgefield"   , title : "Edgefield"   , text : [230, 360], edges : ["81", "83r", "84r", "85r", "82r"]},
      "aiken"         : { name : "aiken"       , title : "Aiken"       , text : [290, 407], edges : ["74", "78r", "79r", "80r", "81r", "77r"]},
      "barnwell"      : { name : "barnwell"    , title : "Barnwell"    , text : [310, 465], edges : ["72", "76r", "75r", "74r", "73r"]},
      "allendale"     : { name : "allendale"   , title : "Allendale"   , text : [337, 509], edges : ["69", "71r", "72r", "70r"]},
      "hampton"       : { name : "hampton"     , title : "Hampton"     , text : [370, 558], edges : ["55", "69r", "68r", "67", "65"]},
      "jasper"        : { name : "jasper"      , title : "Jasper"      , text : [390, 606], edges : ["60", "67r", "66r"]},
      "beaufort"      : { name : "beaufort"    , title : "Beaufort"    , text : [446, 617], edges : ['56', '65r', '60r', '59r', '57r', '58z', '61z', '62z', '63z', '64z']}
    };
    if(to_be_stored){
      for(var id in this.translation_table){
        var entity_name = this.translation_table[id];
        if(entity_name) entities[entity_name].id = id;
      }
      for(var entity_name in entities){
        var entity = entities[entity_name];
        var id = entity.id ? entity.id : entity.name;
        this._get_form_input(entity, true)
        this._get_info_div(entity, true)
        entity.shape = this.paper.set();
      }
    }
    return entities;
  },

  _base_paths : function(){
    return {
      // "oconee" 
      1 : [[85, 213],[72.93, 212.4], [72.52, 209.92], [66.91, 203.73], [59.45, 196.3], [54, 190], [55, 190], [56, 188], [52.74, 187.54], [47.9, 187.47], [45.09, 186.18], [43.21, 185.33], [34.43, 177.85], [32.39, 176], [29.92, 173.77], [26.73, 172], [25.4, 168.87], [22.45, 161.91], [27.01, 161.01], [28.95, 156.96], [30.63, 153.45], [29.21, 145.68], [38, 146], [38, 140], [42, 140], [45, 133], [49.71, 132.89], [50.53, 130.26], [54, 127.46], [57.78, 124.42], [60.53, 123.51], [65, 122], [63, 119], [67, 109], [98, 99]],
      // "oconee-anderson" 
      2 : [[113.17, 179.56], [85, 213]],
      // "oconee-pickens" 
      3 : [[98, 99], [93.81, 111.91], [97.54, 122], [98.18, 136], [99, 150], [103.24, 153.07], [99.91, 158.53], [99, 163], [106, 165], [102.85, 175.68], [113.17, 179.56]],
      // "pickens" 
      4 : [[98, 99], [104.35, 97.02], [112.16, 94.79], [120, 93], [120, 93], [119, 97], [124, 98]],
      // "pickens-greenville" 
      5 : [[170.54, 147.28], [167.79, 143.22], [167.82, 141.57], [167.99, 133.35], [165.35, 131.87], [162.8, 125], [161.2, 120.68], [162.36, 118.74], [158, 116], [159, 108], [150, 109], [152, 103], [149.87, 99.65], [150.77, 98.84], [154, 97], [144, 98.04], [135, 98.04], [124, 98]],
      // "pickens-anderson" 
      6 : [[113.17, 179.56], [118.01, 175.61], [153, 155.3], [155.93, 153.58], [170.54, 147.28]],
      // "greenville" 
      7 : [[124, 98], [124, 97], [129.28, 92.75], [134.4, 89.48], [134.89, 91.46], [137, 85], [140.01, 86.05], [155.89, 80.87], [159, 78], [164.72, 80.23], [166.74, 76.63], [171.83, 76.38], [174.03, 76.43], [175.53, 77.75], [177.63, 76.38], [180.13, 74.51], [178.79, 72.86], [185, 69], [185.62, 70.16], [186.5, 72.33], [187.58, 73.02], [187.58, 73.02], [190.85, 75.11], [200.32, 71.78], [204, 71.49], [214, 72]],
      // "greenville-spartanburg" 
      8 : [[214, 72], [213, 94], [213, 109], [212.03, 130], [211.96, 132.86], [210.9, 138.5], [212.03, 140.68], [213.33, 143.08], [224.09, 153.31]],
      // "greenville-laurens" 
      9 : [[224.09, 153.31], [210.09, 191], [208.06, 197.42], [209.91, 201.34], [207.98, 204.71], [206.54, 207.21], [199.92, 212.58], [197.01, 212.77], [194.01, 212.96], [196,214]],
      // "greenville-anderson" 
      10 : [[196,214], [188.44, 207.95], [186.28, 205.93], [180.17, 200.48], [179.04, 198.86], [178.84, 196.01], [178.16, 194], [176.26, 188.39], [175.16, 189.3], [173.22, 180], [172, 170], [172.76, 167.59], [172.33, 166.36], [172.7, 164], [173.34, 158.01], [170.54, 147.28]],
      // "spartanburg" 
      11 : [[214, 72], [271, 75]],
      // "spartanburg-cherokee" 
      12 : [[297.1, 128.78], [291.42, 125.04], [290.02, 121.87], [287.45, 116.09], [287.81, 107.63], [282, 104], [282.69, 95.94], [274.41, 83.51], [271, 75]],
      // "spartanburg-union" 
      13 : [[297.1, 128.78], [294.75, 131.05], [294.06, 134.62], [287.28, 139.86], [284.76, 147], [280.12, 167], [274.92, 185], [273.66, 189.6], [274.05, 190.1], [271, 195]],
      // "spartanburg-laurens" 
      14 : [[271, 195], [269.48, 193.81], [265.7, 192.37], [263.75, 190.52], [261.41, 188.31], [259.9, 184.87], [256.2, 182.17], [252.04, 179.13], [237.64, 176.29], [236, 162], [228.57, 161.04], [224.09, 153.31]],
      // "cherokee" 
      15 : [[271, 75], [353, 79]],
      // "cherokee-union" 
      16 : [[337, 142], [333.91, 138.49], [330.74, 135.85], [326, 138], [318.58, 135.32], [313.63, 134.8], [312.13, 139.53], [308, 131], [300, 131], [297.1, 128.78]],
      // "cherokee-york" 
      17 : [[353, 79], [347.51, 91.54], [348, 87.82], [348, 102], [345.41, 102], [339.83, 101.46], [337.79, 102.84], [332.77, 106.23], [335.91, 112.22], [335.38, 117], [334.52, 121.91], [334.54, 122.93], [338.23, 136.17], [337, 142]],
      // "york"
      18 : [[353, 79], [404.72, 82.73], [407.42, 83.99], [409.12, 88.35], [410, 91], [404.74, 95.78], [406.1, 97.89], [408, 104], [413.22, 101.44], [415.38, 99.5], [420, 96.3], [421.71, 95.11], [424.57, 92.84], [426.76, 93.16], [431.79, 98]],
      // "york-chester"
      19 : [[335, 149], [433, 149]],
      // "york-lancaster"
      20 : [[433, 149], [434.47, 150.98], [434.56, 149.21], [434.69, 146.55], [437.32, 145.75], [437.8, 143.07], [437.07, 135.99], [437.23, 131.67], [438.76, 130.82], [438.37, 126], [437.79, 118.9], [435.69, 118.77], [433.97, 113.08], [433.04, 110.04], [433.14, 104.4], [433, 101], [431.79, 98]],
      // "york-union"
      21 : [[335, 149], [337, 142]],
      // "lancaster"
      22 : [[431.79, 98], [445.59, 117], [450.98, 125.17], [450, 149], [463, 149], [480, 150], [492.42, 150]],
      // "lancaster-chester"
      23 : [[439.55, 203.4],[436.43, 201.85], [435.05, 190], [434.24, 186.49], [434.03, 184.43], [435.05, 181], [436.86, 177.02], [439.37, 175.58], [438.68, 171], [437.17, 164], [436.59, 156], [436.11, 153.92], [433, 149]],
      // "lancaster-fairfield"
      24 : [[438.66, 220.66], [436.28, 219.65], [434.04, 218.69], [434.45, 216.39], [435.05, 214.58], [439.55, 203.4]],
      // "lancaster-kershaw"
      25 : [[513, 190], [497, 197.76], [491.93, 202.21], [495, 211], [488.58, 214.01], [489.14, 216.21], [483, 212], [483, 214], [477.66, 213.06], [477.5, 214.31], [473, 217], [470.69, 214.06], [465.48, 207.65], [465.85, 213.32], [460, 217], [459, 216], [460, 205], [454.03, 208.08], [448.42, 212.55], [443.08, 216.64], [441.37, 217.95], [438.66, 220.66]],
      // "lancaster-chesterfield"
      26 : [[492.42, 150], [498.79, 166.4], [513, 187],[513, 190]],
      // "chesterfield"
      27 : [[492.42, 150], [593, 151]],
      // "chesterfield-kershaw"
      29 : [[536, 238], [534.46, 232.06], [531.15, 229.89], [529.7, 225], [528.57, 214.04], [527.56, 210.41], [524.86, 208.99], [522.42, 204.16], [519.57, 198.53], [519.82, 192.25], [513,190]],
      // "chesterfield-darlington"
      30 : [[608.15, 207.16], [603.75, 212.02], [601.91, 212.89], [589, 215], [585.89, 212.92], [573, 215.59], [536, 238]],
      // "chesterfield-malboro"
      31 : [[608.15, 207.16], [614.8, 201.98], [615, 192], [621, 190], [618, 182], [613.64, 180.58], [608.74, 178.7], [606, 174.79], [600.95, 164.09], [594.84, 159.94], [593, 151]],
      // "malboro"
      32 : [[593, 151], [637, 152], [676, 190.19]],
      // "malboro-darlington"
      33 : [[639.43, 248.3], [639.02, 248.76], [636.46, 243.4], [639, 237], [636, 236], [637, 232], [631, 231], [625, 219], [629, 220], [629.4, 211.37], [628, 214.56], [624, 208], [622, 208], [620.34, 212.32], [619.2, 212.45], [615, 214], [608.15, 207.16]],
      // "malboro-dillon"
      34 : [[676, 190.19], [646, 252]],
      // "malboro-florence"
      35 : [[646, 252], [639.43, 248.3] ],
      // "dillon"
      36 : [[738, 250.89], [676, 190.19]],
      // "dillon-florence"
      37 : [[655.85, 261.39], [655.43, 255.82], [646, 252]],
      // "dillon-marion"
      38 : [[731, 259], [728.65, 258.08], [723.68, 254.95], [722, 255], [718.59, 255.11], [715.71, 260.31], [710, 259.13], [704, 256.77], [700.89, 255.9], [700.03, 256.83], [696, 255.14], [691.21, 253.13], [688.77, 250.46], [683, 251.39], [681, 251.71], [672.82, 253.65], [671.3, 254.57], [668, 256.57], [664.77, 261.59], [660.18, 261.48], [655.85, 261.39]],
      // "dillon-horry"
      39 : [[738, 250.89], [731, 259]],
      // "horry"
      40 : [ [738, 250.89], [828, 339], [818, 342.56], [801.68, 348.52], [802.34, 348.56], [789, 359.68], [780, 367.04], [772.69, 374.01], [769.06, 379.3], [762.93, 387], [761.14, 389.25], [757.81, 394.79], [755.79, 395.98]],
      // "horry-marion"
      41 : [[721, 370], [719.82, 360.48], [707.57, 358.02], [712, 345], [709, 344], [709.79, 340.63], [710.41, 337.33], [708.15, 334.3], [705.12, 330.24], [700.76, 331.84], [702, 325], [700, 325], [697.41, 317.02], [702, 306], [705.28, 304.71], [708.57, 302.94], [710.35, 299.7], [712.97, 294.91], [709.44, 294], [716, 290], [717.2, 278.98], [721.05, 277.82], [726, 270], [728, 271], [731, 259]],
      // "horry-georgetown"
      42 : [[755.79, 395.98], [752.99, 397], [737, 397], [737, 389], [735, 391], [734, 391], [733.05, 386.37], [733.26, 380.67], [728, 380], [729, 376], [721, 370]],
      // "georgetown"
      43 : [[755.79, 395.98],[745.63, 412], [740.65, 418], [736.13, 429], [730.7, 440], [726.38, 461], [727, 471], [725.4, 467.24], [724.42, 464.1], [724.09, 460], [723.87, 457.23], [724.35, 453.8], [721.69, 452.02], [719.65, 450.66], [714.51, 451], [712, 451], [716, 439], [709, 439], [708.97, 442.78], [707.13, 451.73], [708.11, 454], [710.66, 459.9], [720.33, 463.12], [722, 465.63], [723.32, 467.64], [722.12, 473.35], [722, 476], [726, 476], [723.57, 481.98], [715.89, 488.59], [710, 491]],
      // "georgetown-marion"
      44 : [[700, 357], [703.47, 363.26], [705.02, 373.07], [714, 373.49], [721, 370]],
      // "georgetown-williamsburg"
      45 : [[640.16, 453.68], [640.92, 448.98], [641.52, 445.34], [646.42, 441.23], [648.56, 437.91], [653.5, 430.26], [656.35, 422.97], [662.66, 416.21], [665.42, 413.25], [667.29, 412.74], [669.79, 410.47], [679.31, 399.72], [681.17, 396.79], [679.51, 395.11], [681.21, 389], [682.66, 378.53], [692.83, 364.96], [695.8, 361], [695.53, 359.76], [700, 357]],
      // "georgetown-charleston"
      46 : [[710, 491], [710.08, 488.4], [710.32, 486.76], [707.74, 485.27], [704.87, 483.62], [699.58, 484.05], [695, 481.72], [689.15, 478.74], [684.96, 472.37], [679, 471]],
      // "georgetown-berkeley"
      47 : [[679, 471], [678, 466], [675, 464], [667.7, 467.62], [665.3, 462.73], [659.68, 459.75], [648, 455.64], [644.74, 454.46], [640.16, 453.68]],
      // "charleston"
      48 : [[710, 491], [707.67, 494.16], [701.92, 493.87], [697.23, 498.53], [693.95, 501.79], [695.63, 504.07], [693.97, 506.5], [692.09, 509.27], [686.13, 510.51], [683, 511], [682.35, 507.19], [682.25, 507.08], [679, 505], [677, 512], [675, 512], [672.46, 507.75], [672, 506.82], [667, 506], [665.43, 510.15], [664.35, 509.17], [661.37, 511.76], [659.41, 513.47], [658.22, 515.69], [656.8, 517.83], [652.49, 524.34], [650.45, 529.77], [661, 529], [659.07, 535.22], [651.2, 537.84], [646, 541.33], [636.23, 547.89], [639.16, 549.96], [633.74, 554.16], [622.09, 559.93], [619.14, 561.81], [612.12, 567.26], [610.41, 570.09], [608.55, 573.18], [607.54, 578.2], [605.44, 580.61], [595.04, 588.13], [592.97, 589.78], [589.87, 593.28], [587.79, 594.11], [584.26, 595.53], [581.02, 593.68], [572, 597.06], [568.98, 598.2], [560.11, 603.16], [558, 602.99], [553.62, 602.66], [551.28, 598.1], [548.45, 595.49], [546.26, 593.46], [545, 593.64], [543, 591], [540, 592], [554, 603], [552.84, 605.79], [551.66, 608.53], [548.7, 609.87], [543.89, 612.03], [541.07, 607.91], [535, 614], [527,611], [531, 618]],
      // "charleston-berkeley"
      49 : [[564, 520], [567.15, 519.04], [573.43, 516.25], [576.44, 517.84], [579.8, 519.61], [579.22, 531.81], [584.41, 534.97], [586.38, 536.12], [590.65, 535.19], [593, 534.97], [590.08, 547.52], [597.6, 540.52], [598, 552], [603.7, 551.07], [604.55, 549.61], [604, 544], [611.06, 540.82], [613.22, 540.32], [614, 532], [625, 528], [627.35, 518.04], [627.35, 518.04], [641.96, 499], [644.13, 496.08], [646.46, 490.92], [649.21, 489.16], [660.01, 484.69], [662.84, 484.28], [664.77, 485.53], [666.59, 484.69], [670.14, 483.14], [671.76, 472.12], [679, 471]],
      // "charleston-dorchester"
      50 : [[519, 545], [535, 546.71], [562, 553], [557, 545], [565, 537], [571, 539], [572.08, 531], [564, 520]],
      // "charleston-colleton"
      51 : [[531, 618], [516, 608], [520.86, 601.78], [521.35, 600.19], [520, 592], [515, 595], [514, 592], [518.42, 590.58], [519.19, 589.18], [521, 585], [514.07, 583.78], [517.19, 580.92], [515.26, 576.01], [514.13, 573.13], [512.3, 571.85], [510, 570], [511.8, 555.51], [519.65, 556.89], [519, 545]],
      // "colleton"
      52 : [[531, 618], [518, 623], [511.45, 614.37], [508.77, 620.35], [503.39, 615.49], [495.15, 608.04]],
      // "colleton-dorchester"
      53 : [[449, 480], [461.01, 483.34], [466.66, 486.05], [468.64, 491.44], [472.29, 495.82], [478.92, 503.78], [486.17, 507.15], [496, 503], [505.99, 504.5], [511.42, 505.99], [519, 507], [517.86, 511.4], [515.09, 516.43], [514.97, 521], [514.88, 524.59], [516.83, 526.68], [517.5, 530], [519, 545]],
      // "colleton-bamberg"
      54 : [[403, 511], [427, 497], [431, 505], [434, 505], [436.7, 495.28], [436.24, 500.61], [435, 491], [442.98, 485.69], [449, 480]],
      // "colleton-hampton"
      55 : [[444.77, 574.16], [432.28, 549], [428.63, 543.39], [423.1, 540.99], [419.45, 536.41], [412.79, 524], [403, 511]],
      // "colleton-beaufort"
      56 : [[495.15, 608.04], [505.45, 600.77], [495, 599], [495, 604], [488, 603], [489, 600], [488, 599], [480, 600], [473.75, 593.45], [476.42, 595.61], [474, 587], [471, 588], [470, 585], [473, 582], [464.47, 582.91], [467.35, 581.54], [462.72, 580.97], [458, 580.97], [453.67, 580.32], [447.55, 577.63], [444.77, 574.16]],
      // "beaufort-1// "
      57 : [[495.15, 608.04], [499.63, 617.78], [506, 620], [505, 625], [497.19, 624.99], [491.44, 623.33], [485, 629.09], [489.85, 628.12], [501.34, 626.36], [505.57, 629.09], [507.32, 630.34], [508.83, 634.03], [510, 636], [502.26, 639.82], [497.78, 643.24], [493.27, 647.3], [495, 652], [491, 652], [490.41, 657.16], [488.52, 660.32], [484.49, 663.67], [482.96, 664.94], [480.02, 667.08], [478.55, 664.51], [477.3, 662.25], [478.55, 656.61], [478.55, 654], [478.5, 649.72], [476.95, 647.8], [474, 645], [473, 659], [466.41, 656.95], [467.6, 653.91], [463.57, 649.45], [458.99, 644.87], [456.1, 641.12], [452.51, 630.87], [450.41, 626.09], [447, 623]], 
      // "beaufort-2// "
      58 : [[474, 632], [471.14, 632.67], [472, 643], [473, 638], [475, 642], [473.84, 632.39], [479.03, 633.34], [474, 628], [474, 632]],
      // "beaufort-3// "
      59 : [[447, 623], [446, 628], [448.06, 634.95], [450.08, 642.05], [454.55, 648], [458.17, 652.8], [461.2, 653.35], [464, 659], [452.81, 654.67], [455.4, 648.71], [445, 643], [449.19, 651.72], [450.41, 648.06], [449, 659], [440, 655], [443.25, 661.13], [450.08, 663.71], [452, 655], [455.7, 657.32], [456.14, 660.06], [459.18, 662.69], [463.15, 666.11], [468.74, 665.26], [471.11, 672.04], [472.42, 675.82], [469.97, 678.99], [468, 682], [466.68, 684.01], [464.16, 687.98], [462.48, 689.49], [459.44, 692.25], [450.13, 695.56], [446, 696], [450.6, 683.95], [458.09, 683.25], [452, 672], [452, 677], [445.26, 676.37], [443.14, 673.68], [437, 678], [442.92, 678.34], [445.99, 678.38], [451, 682], [438, 693], [444, 690], [443.53, 698.34], [441.56, 701.42], [433, 700]], 
      // "beaufort-jasper"
      60 : [[433, 700], [434, 695], [430, 694], [432, 690], [425, 690], [424.91, 687.13], [424.96, 684.7], [423.11, 682.27], [420.37, 678.69], [415.91, 678.92], [414.6, 673], [413.76, 669.16], [416.38, 667.39], [417.03, 664], [417.5, 661.56], [416.71, 659.29], [416, 657], [428, 658], [428.29, 644.65], [431.95, 647.58], [438, 649], [446, 634], [442, 634], [444, 628], [446, 628], [447, 623], [444.87, 615.67], [444.15, 612], [444.81, 605.18], [446.05, 600.13], [442, 594], [439.9, 585]],
      // "beaufort-4// "
      61 : [[470, 643], [471, 644], [471, 643], [470, 643]], 
      // "beaufort-5// "
      62 : [[469, 644], [470, 645], [470, 644], [469, 644]],
      // "beaufort-6// "
      63 : [[470, 645], [471, 646], [471, 645], [470, 645]], 
      // "beaufort-7// "
      64 : [[472, 646], [473, 647], [473, 646], [472, 646]],
      // "beaufort-hampton"
      65 : [[439.9, 585], [444, 577], [444.77, 574.16]],
      // "jasper"
      66 : [[433, 700], [431.79, 701.25], [431.95, 701.5], [436, 705], [432, 710], [435, 712], [427.92, 711.18], [428.78, 709.46], [423.93, 705.29], [419.59, 702.2], [416.63, 699.98], [413.65, 698.75], [411.73, 701.18], [408, 700.53], [405.14, 700.03], [399.78, 695.73], [396, 694], [395, 684], [398, 684], [397, 678], [393.84, 676.1], [390.47, 672], [391.35, 668], [391.9, 665.56], [394.33, 663.21], [394.84, 660], [395.11, 658.26], [394.61, 655.73], [394.24, 654], [392.8, 647.37], [391.01, 648.79], [388.14, 644.74], [382.41, 634], [380.45, 628.93], [383.73, 627.82], [382.41, 624.28], [380.32, 619.81], [377, 620.62], [377, 614], [365.31, 609.79]],
      // "jasper-hampton"
      67 : [[365.31, 609.79], [368.6, 605.63], [376, 599.05], [400, 578.93], [402.42, 576.73], [409.92, 569.28], [412.91, 569.18], [416.9, 569.04], [421.58, 577.24], [425, 580], [424.57, 581.35], [422.85, 585.81], [423.07, 586.94], [423.59, 589.74], [431.48, 592.23], [434, 593], [437, 587], [439, 587], [439.9, 585]],
      // "hampton"
      68 : [[365.31, 609.79], [359.11, 603.77], [356.42, 602.83], [347.89, 595.69], [347.2, 592.98], [346.56, 590.44], [348.08, 588.64], [348.29, 586], [348.62, 581.81], [346.8, 578.82], [344, 576], [347, 572], [345, 572], [347, 567]],
      // "hampton-allendale"
      69 : [[347, 567], [351.75, 567.16], [356.73, 563.74], [358.99, 562.19], [360.13, 559.58], [362.05, 557.51], [364.08, 555.33], [368.19, 552.11], [369.68, 549.71], [373.27, 543.97], [365.75, 537.72], [376, 536], [376.02, 534.15], [375.92, 531.92], [376.56, 530.17], [378.19, 525.68], [388.77, 519.46], [393, 517], [396.19, 515.15], [403, 511]],
      // "allendale"
      70 : [[347, 567], [344, 560], [344.7, 553.1], [345.64, 549.77], [339, 546], [338.52, 541.83], [338.09, 541.71], [335, 539], [337.08, 534.57], [332.15, 532.36], [330, 524], [335.51, 516.61], [329.73, 507.12], [321, 507], [321, 503], [313, 498]],
      // "allendale-bamberg"
      71 : [[380.99, 493.31], [385.59, 494.45], [389.8, 500.65], [393.16, 503.86], [396.88, 507.41], [397.76, 506.23], [403, 511]],
      // "allendale-barnwell"
      72 : [[313, 498], [314.34, 495.17], [314.89, 494.34], [317.06, 492], [318.95, 489.95], [322.21, 486.48], [325, 485.92], [327.37, 485.44], [332.52, 487.52], [335, 488.28], [342.92, 490.73], [350.6, 494.9], [359, 495], [380.99, 493.31]],
      // "barnwell"
      73 : [[313, 498], [310.68, 495.87], [309.51, 496.3], [308, 496.24], [303.02, 496.05], [290.6, 488.46], [287.77, 484], [283.43, 477.17], [287, 475]],
      // "barnwell-aiken"
      74 : [[287, 475], [294.29, 470.37], [352.09, 418.92]],
      // "barnwell-orangeburg"
      75 : [[352.09, 418.92], [354.09, 418.38], [356.05, 419.12], [358, 419.49], [360.78, 420.03], [363.41, 419.99], [366, 421.31], [371.38, 424.06], [370.69, 426.45], [378, 428]],
      // "barnwell-bamberg"
      76 : [[378, 428], [380.99, 493.31]],
      // "aiken"
      77 : [[287, 475], [286, 471], [279.47, 473.35], [281.47, 472.79], [272, 466], [276, 464], [270, 456], [273, 453], [267, 453], [262, 445], [258.7, 444.79], [258.89, 444.7], [257, 442], [260, 441], [259, 433], [262, 434], [259, 430], [265.36, 422.63], [252.44, 419.16], [249.89, 416.3], [248.11, 414.32], [246.61, 409.59], [246, 407]],
      // "aiken-orangeburg"
      78 : [[386, 390], [352.09, 418.92]],
      // "aiken-lexington"
      79 : [[319, 340], [329.13, 351.63], [339.85, 358.21], [346.15, 368.15], [359, 371.88], [386, 390]],
      // "aiken-saluda"
      80 : [[304, 353.71] , [319, 340]],
      // "aiken-edgefield"
      81 : [[246, 407], [304, 353.71]],
      // "edgefield"
      82 : [[246, 407], [236.88, 397.58], [233.21, 399.34], [230.64, 395.73]],
      // "edgefield-saluda"
      83 : [[247, 321.61], [265,317], [265.88, 323.37], [267.93, 333.58], [270.51, 336.83], [275.72, 343.38], [295.6, 349.1], [304, 353.71]],
      // "edgefield-greenwood"
      84 : [[239, 323.65], [247, 321.61]],
      // "edgefield-mccormick"
      85 : [[230.64, 395.73], [227.72, 391.63], [232.64, 389.39], [228.71, 384.17], [224.09, 378.03], [218.98, 376.21], [217, 368], [220.89, 363.63], [219.47, 354.03], [229, 349], [222.85, 338], [222, 328], [239, 323.65]],
      // "mccormick"
      86 : [[230.64, 395.73], [224.49, 396.94], [216.06, 390.46], [214.59, 386.95], [213.81, 385.07], [214.19, 383.25], [212.83, 380.42], [208.54, 373], [207.52, 370.33], [207.42, 366.45], [205.16, 363.17], [198.54, 356.58], [195.13, 351.61], [192.58, 348.49], [185.58, 343.77], [182, 341.55], [178.06, 339.11], [176.74, 339.8], [173, 337.24], [162.56, 330.12], [163.78, 323.85], [155, 324], [150.81, 315], [150.22, 313.41], [149.53, 311.74], [149, 310]],
      // "mccormick-greenwood"
      87 : [[193, 300.95], [196, 319], [208, 311], [214.52, 322.84], [219.62, 316.85], [227.72, 317.16], [240, 318], [239, 323.65]],
      // "mccormick-abbeville"
      88 : [[149, 310], [150.6, 305.96], [156.11, 300.35], [160.02, 299.17], [168.98, 296.47], [167.64, 299.65], [175, 300.95], [185.01, 302.62], [184.21, 301.19], [193, 300.95]],
      // "abbeville"
      89 : [[149, 310], [145.89, 303.32], [143.92, 301.23], [140, 298], [140.17, 288.45], [131.58, 285.03], [128.82, 281.61], [126.33, 278.54], [125.52, 272.85], [125, 269]],
      // "abbeville-anderson"
      90 : [[125, 269], [196,214]],
      // "abbeville-laurens"
      91 : [[196,214], [206, 229]],
      // "abbeville-greenwood"
      92 : [[206, 229], [193.47, 239.54], [193.72, 245], [193.78, 246.34], [195.02, 248.56], [195.45, 250], [196.1, 252.22], [195.85, 254.66], [197.02, 256.72], [198.49, 259.3], [201.99, 261.24], [204.59, 266], [209.2, 274.47], [207.21, 285.93], [200.79, 292.91], [193, 300.95]],
      // "anderson"
      93 : [[125, 269], [124, 264.77], [124.29, 260.99], [122.84, 258.04], [117.97, 250.91], [115.07, 243.29], [113.11, 240.29], [110.6, 239.62], [109.12, 235.83], [106.65, 229.51], [106.89, 218.99], [100.73, 214.82], [96.97, 212.27], [89.76, 213.41], [85, 213]],
      // "laurens-union"
      94 : [[271, 195], [276.24, 193.44], [277.25, 196.37], [282, 197], [282, 199], [286.72, 198.74], [287.75, 199.77], [292, 201.15], [296.16, 202.5], [303.98, 201.81], [305.85, 206.14], [307.47, 209.89]],
      // "laurens-greenwood"
      95 : [[257, 271], [250.72, 265.54], [244.59, 261.9], [234.71, 253.34], [221.54, 245.2], [217.71, 240.08], [206, 229]],
      // "laurens-newberry"
      96 : [[257, 271], [263.79, 263], [267.23, 253.27], [277.09, 245.07], [283.7, 241.2], [293.18, 227.1], [298.41, 221.63], [307.47, 209.89]],
      // "greenwood-saluda"
      97 : [[247, 321.61], [269, 285]],
      // "greenwood-newberry"
      98 : [[269, 285], [265.07, 282.44], [264.82, 281.64], [265, 277], [257, 271]],
      // "newberry-richland"
      99 : [[358,274], [364.44, 262.5]],
      // "union-chester"
      100 : [[335, 149], [335.22, 151.59], [336.49, 152.07], [337.52, 152.99], [343.38, 158.22], [336.27, 162.67], [335.16, 165.1], [334.75, 166.56], [334.97, 167.55], [335.16, 169], [339, 168], [340.74, 179], [345.83, 188.09], [344.87, 197]],
      // "union-fairfield"
      101 : [[344.87, 197], [345, 215]],
      // "union-newberry"
      102 : [[307.47, 209.89], [312.61, 209.47], [318.41, 213.3], [321.34, 217.2], [321.34, 217.2], [323.03, 219.44], [322.83, 222.18], [324.26, 223.06], [326.09, 224.18], [328.71, 221.32], [330.01, 220.27], [336.56, 215.01], [337.15, 215.89], [345, 215]],
      // "chester-fairfield"
      103 : [[439.55, 203.4], [344.87, 197]],
      // "fairfield-newberry"
      104 : [[364.44, 262.5], [359.9, 257.34], [358.24, 254.12], [354.83, 247.52], [355.25, 247.44], [352.75, 241], [345.98, 223.63], [345, 215]],
      // "fairfield-richland"
      105 : [[364.44, 262.5], [371.46, 271.86], [374.09, 272.92], [375.78, 273.47], [376.4, 273.14], [378, 272.92], [387, 280], [387, 271.12], [399, 271.12], [399, 271.12], [418, 265.43], [444, 261]],
      // "kershaw-richland"
      106 : [[481, 293.89], [475.86, 293.5], [467.87, 300.03], [462, 297.8], [459.52, 296.85], [456.05, 292.99], [454, 291.09], [439, 278], [439.98, 272.78], [444, 261]],
      // "fairfield-kershaw"
      107 : [[444, 261], [447.26, 255.62], [449.78, 250], [451.75, 245.61], [454.8, 240.99], [453.34, 236], [451.38, 229.3], [447.42, 231.17], [444, 229.24], [440.6, 227.31], [439.05, 224.58], [438.66, 220.66]],
      // "kershaw-lee"
      108 : [[536, 238], [526.49, 244.86], [522, 245], [524, 252], [519.93, 252.28], [512.37, 253.42], [511.08, 258.06], [511.08, 264], [510.74, 273.51], [502, 282]],
      // "kershaw-sumter"
      109 : [[502, 282], [495, 286.58], [493.12, 288.12], [489.08, 291.52], [487, 292.39], [484.39, 293.48], [483.44, 292.75], [481.17, 292.97], [481, 293.89]],
      // "darlington-lee"
      110 : [[574, 295], [566.43, 290.25], [559.73, 286.5], [559.73, 282], [559.73, 278.9], [562.7, 276.67], [564.23, 274], [565.2, 271.47], [565.07, 268.68], [564.23, 266], [562.34, 256.43], [559.46, 256.44], [556.6, 250.96], [554.86, 247.6], [554.3, 242.76], [554, 239], [548.16, 242.17], [547.04, 250.27], [539.11, 243.52], [537.77, 242.37], [537.06, 241.35], [536, 238]],
      // "darlington-florence"
      111 : [[639.43, 248.3], [640.13, 246.75], [637, 255], [628, 253], [625, 263], [613.77, 260.93], [576.84, 293.61], [574, 295]],
      // "florence-marion"
      112 : [[655.85, 261.39], [657.01, 262.28], [657.01, 262.28], [657.96, 263.81], [659.25, 266.15], [659.36, 267.96], [659.58, 271.62], [656.3, 272.93], [656.28, 276.03], [656.27, 279.26], [661.72, 284.49], [662.7, 289], [663.74, 292.33], [662.19, 293.9], [662.7, 297], [665.07, 305], [666.94, 312.05], [663.63, 313.47], [670, 319], [669.85, 327.87], [680.19, 331.87], [685.57, 337.62], [689.62, 341.93], [689.32, 345.17], [696, 345], [700, 357]],
      // "florence-williamsburg"
      113 : [[700, 357], [688, 348], [685.87, 351.81], [684.78, 351.66], [681, 353.49], [670.74, 358.45], [667.3, 356.84], [657, 354.12], [653.03, 353.07], [648.41, 352.51], [646, 349], [631.93, 352.55], [631.8, 348.51], [626, 346.58], [623.77, 345.84], [621.28, 346.17], [619.18, 344.98], [614.52, 342.32], [614.37, 336.3], [607, 335.89]],
      // "florence-clarendon"
      114 : [[607, 335.89], [593, 335.89], [592.19, 333.57], [589.74, 328.34], [589.74, 328.34], [590.11, 326.09], [590.66, 322.79]],
      // "florence-sumter"
      115 : [[590.66, 322.79], [599.96, 317.56], [588, 306.41]],
      // "florence-lee"
      116 : [[588, 306.41], [580.47, 301.14], [574, 295]],
      // "saluda-newberry"
      117 : [[269, 285], [269, 280], [273, 278], [276.35, 279.29], [276.65, 279.03], [280, 279.51], [288.48, 280.71], [286.03, 279.59], [294, 277], [299.1, 281.77], [308.96, 283.3], [314, 292], [317, 291], [321.56, 296.87], [328.71, 299.47], [336, 299]],
      // "saluda-lexington"
      118 : [[336, 299], [319, 340]],
      // "lexington-newberry"
      119 : [[336, 299], [338, 298], [345, 298], [347.51, 300.25], [347.67, 300.09], [351, 300], [348.11, 292.57], [343.45, 290.74], [344.74, 285.96], [346.2, 280.58], [348.68, 280], [353.02, 278.06], [354.96, 277.18], [356.72, 275.76], [358,274]],
      // "lexington-richland"
      120 : [[358,274], [358.98, 276.16], [362, 276.7], [363.64, 279.6], [365, 282], [362.46, 285.99], [365.99, 291.88], [370.17, 293.69], [371.93, 294.46], [378.6, 293.84], [385, 296.48], [393.17, 299.86], [394, 304.34], [398.78, 309.74], [401.27, 312.54], [403.61, 313.1], [405.57, 314.91], [407.45, 316.65], [411.32, 325.51], [411.32, 328], [411.32, 329.93], [410.74, 330.44], [410, 332], [414, 334], [415, 339]],
      // "lexington-calhoun"
      121 : [[415, 339], [410.66, 341.3], [407.88, 354], [405.7, 361.94], [405.75, 363.08], [406.14, 364.21], [407.29, 364.68], [410.32, 365.92], [412.91, 361.03], [414, 359], [427, 362], [427, 364], [409, 375]],
      // "lexington-orangeburg"
      122 : [[409, 375],[386, 390]],
      // "richland-calhoun"
      123 : [[415, 339], [416, 340], [415, 343], [429, 350], [431.45, 353.76], [432.99, 353.13], [437, 352], [445, 361], [448.37, 360.66], [449.72, 360.28], [452, 363], [457, 361], [462.89, 365.76], [469.99, 361.73], [473.96, 363.81], [477, 366]],
      // "richland-sumter"
      124 : [[477, 366],[482.08, 357.58], [481.98, 354.24], [480.59, 349.25], [479.96, 345.58], [479.09, 342.5], [480.34, 340.51], [479.96, 337], [479.96, 333.33], [477.9, 330.83], [481, 328], [477.76, 315.87], [482.2, 308.68], [483, 302], [479.43, 299.31], [480.03, 298.13], [481, 293.89]],
      // "orangeburg-dorchester"
      125 : [[524, 463], [516.96, 462.23], [507.48, 464.8], [503.17, 456.94], [502.18, 455.13], [501.59, 450.41], [501, 448], [466, 470.16], [449, 480]],
      // "orangeburg-clarendon"
      126 : [[499, 406], [500, 409], [501.07, 402.86], [503.06, 405.9], [509, 407], [506, 409], [506.73, 413.86], [507.51, 412.85], [509.93, 416.42], [517.13, 427.01], [524.45, 433.67], [537, 426], [544, 426], [544, 428], [547, 427]],
      // "orangeburg-berkeley"
      127 : [[547, 427], [547, 436], [544, 436], [544, 444.27], [543.96, 455.13], [536, 459.95], [529.65, 463.79], [527.84, 456.66], [524, 463]],
      // "orangeburg-bamberg"
      128 : [[449, 480], [444, 475], [441.77, 468.47], [425, 454.45], [407.46, 444.32], [401.83, 440.12], [396, 437.93], [385.37, 432.53], [378, 428]],
      // "orangeburg-calhoun"
      129 : [[499, 406], [489.41, 401.14], [491.58, 401.62], [481, 404], [481, 406], [484, 407], [481.61, 413.16], [478.93, 413.54], [480, 420], [468.69, 419.85], [471.42, 415.95], [465.7, 409.04], [463.87, 406.82], [453.6, 398.08], [451, 396.19], [447.47, 393.62], [440.41, 391.19], [436, 391.54], [427, 393], [426, 386], [421, 389], [409, 375]],
      // "berkeley-williamsburg"
      130 : [[570.13, 416.15], [569.09, 414.63], [574, 414.3], [576.91, 414.09], [589.73, 415.37], [592, 416.67], [604.12, 426.41], [609.47, 432.58], [611.5, 438.34], [621, 440], [627.21, 448.43], [640.16, 453.68]],
      // "berkeley-clarendon"
      131 : [[547, 427], [555.01, 426.43], [564.07, 427.24], [560, 418], [564, 415], [570.13, 416.15]],
      // "berkeley-dorchester"
      132 : [[564, 520], [559, 509.54], [544, 496.08], [541.56, 493.84], [536.14, 489.7], [534.58, 487], [533.39, 484.12], [534.93, 482.38], [534.58, 480.04], [533.81, 477.82], [531.97, 476.49], [530.71, 474.72], [528.03, 470.92], [525.3, 464.58], [524, 463]],
      // "calhoun-clarendon"
      133 : [[495, 387], [494.08, 391.29], [495.99, 394.09], [499, 397], [499, 406]],
      // "calhoun-sumter"
      134 : [[477, 366], [479.19, 370.07], [481.27, 372.83], [484.41, 376.98], [490.92, 383.8], [495, 387]],
      // "sumter-clarendon"
      135 : [[590.66, 322.79], [537.72, 356.52], [517, 360], [518, 371], [512, 372], [513, 367], [508, 367], [508, 372], [503, 371], [501.97, 374.89], [499.39, 384.46], [495, 387]],
      // "sumter-lee"
      136 : [[502, 282], [504.83, 289.13], [500.24, 290.84], [511, 295.72], [522.54, 300.96], [531.26, 292.66], [534, 307], [540, 308], [540.19, 310.44], [541, 316], [552, 314], [553, 324], [569, 315.11], [578.74, 311.83], [584, 305], [588, 306.41]],
      // "williamsburg-clarendon"
      137 : [[607, 335.89], [597.61, 349.46], [586.42, 359.42], [587.26, 370], [581.28, 384], [573.42, 402], [568.19, 412.42], [570.13, 416.15]]
    };
  }

});
})(jQuery);

/*!
 * The following copyright notice may not be removed under any circumstances.
 * 
 * Copyright:
 * Created by Nathan Willis,,, with FontForge 2.0 (http://fontforge.sf.net)
 * 
 * License information:
 * http://scripts.sil.org/OFL
 */
Raphael.registerFont({"w":1263,"face":{"font-family":"News Cycle","font-weight":500,"font-stretch":"normal","units-per-em":"2048","panose-1":"2 0 5 3 0 0 0 0 0 0","ascent":"1638","descent":"-410","x-height":"12","bbox":"-63 -1532.04 1589 445","underline-thickness":"102","underline-position":"-204","unicode-range":"U+0041-U+007A"},"glyphs":{" ":{},"A":{"d":"25,0r432,-1515r216,0r432,1515r-154,0r-130,-478r-509,0r-133,478r-154,0xm346,-602r440,0r-221,-787","w":1130,"k":{"C":22,"G":22,"O":22,"Q":22,"T":153,"U":20,"V":92,"W":72,"Y":134,"c":14,"e":14,"o":14,"q":14,"d":13,"f":35,"t":57,"v":56,"w":50,"y":67}},"B":{"d":"1064,-410v0,261,-178,410,-456,410r-473,0r0,-1515r473,0v226,-7,421,150,421,363v0,207,-89,315,-255,352v162,41,290,181,290,390xm924,-410v4,-187,-130,-316,-316,-316r-325,0r0,602r325,0v213,1,312,-83,316,-286xm895,-1152v0,-165,-112,-239,-287,-239r-325,0r0,538r325,0v195,1,287,-103,287,-299","w":1132,"k":{"T":57,"X":41,"Y":26,"Z":13,"f":12,"g":15,"s":13,"t":12,"v":9,"w":9,"x":32,"y":9,"z":20}},"C":{"d":"618,-108v193,0,342,-159,342,-355r146,23v-52,165,-118,324,-260,403v-159,89,-400,51,-512,-37v-212,-167,-296,-532,-236,-906v36,-226,134,-415,314,-506v150,-76,370,-44,465,42v55,50,113,114,144,182v37,82,51,116,63,175r-152,41v-16,-125,-43,-183,-90,-252v-45,-65,-125,-110,-224,-110v-260,0,-390,216,-390,649v0,185,27,337,82,454v62,131,165,197,308,197","w":1174,"k":{"T":29,"X":50,"Y":19,"g":26,"s":21,"x":24,"z":14}},"D":{"d":"135,0r0,-1515r361,0v335,0,539,149,614,446v62,251,41,569,-54,753v-99,192,-285,316,-560,316r-361,0xm496,-124v340,7,509,-252,502,-621v-6,-332,-66,-517,-284,-609v-111,-47,-275,-35,-431,-37r0,1267r213,0","w":1214,"k":{"A":22,"J":23,"T":76,"V":19,"W":13,"X":64,"Y":55,"Z":42,"a":9,"g":12,"x":21,"z":16}},"E":{"d":"135,0r0,-1515r821,0r0,124r-673,0r0,533r483,0r0,124r-483,0r0,601r711,0r0,133r-859,0","w":1062,"k":{"C":48,"G":48,"O":48,"Q":48,"S":19,"a":11,"c":50,"e":50,"o":50,"q":50,"d":49,"f":49,"g":17,"s":16,"t":65,"u":22,"v":109,"w":96,"y":127}},"F":{"d":"135,0r0,-1515r821,0r0,124r-673,0r0,533r483,0r0,124r-483,0r0,734r-148,0","w":1024,"k":{"A":155,"C":48,"G":48,"O":48,"Q":48,"J":271,"S":27,"a":161,"c":144,"e":144,"o":144,"q":144,"d":144,"i":32,"j":32,"m":136,"n":136,"p":136,"r":136,"f":68,"g":146,"s":122,"t":56,"u":133,"v":105,"w":103,"x":190,"y":109,"z":197}},"G":{"d":"967,-1063v-27,-182,-124,-345,-327,-345v-164,0,-264,88,-325,202v-114,213,-110,705,-7,898v71,133,180,200,331,200v187,0,296,-108,325,-324v6,-47,9,-100,9,-159r-337,0r0,-124r482,0r0,715r-120,0r0,-192v-75,104,-155,170,-239,192v-105,28,-236,20,-335,-30v-235,-120,-344,-387,-344,-726v0,-295,82,-516,236,-660v148,-138,408,-157,585,-31v95,68,167,182,211,348","w":1246,"k":{"T":48,"V":15,"Y":37,"f":14,"g":11,"t":11}},"H":{"d":"135,0r0,-1515r148,0r0,657r688,0r0,-657r148,0r0,1515r-148,0r0,-734r-688,0r0,734r-148,0","w":1254,"k":{"a":10,"b":10,"h":10,"k":10,"c":14,"e":14,"o":14,"q":14,"d":15,"i":10,"j":10,"m":10,"n":10,"p":10,"r":10,"g":19,"l":11,"s":10,"u":12}},"I":{"d":"135,0r0,-1515r148,0r0,1515r-148,0","w":418,"k":{"a":10,"b":10,"h":10,"k":10,"c":14,"e":14,"o":14,"q":14,"d":15,"i":10,"j":10,"m":10,"n":10,"p":10,"r":10,"g":19,"l":11,"s":10,"u":12}},"J":{"d":"761,-429v-3,277,-110,438,-370,445v-199,5,-318,-120,-366,-260r103,-53v36,89,124,189,258,189v177,0,227,-133,227,-321r0,-1086r148,0r0,1086","w":896,"k":{"A":13,"a":13,"b":9,"h":9,"k":9,"c":14,"e":14,"o":14,"q":14,"d":14,"i":10,"j":10,"m":14,"n":14,"p":14,"r":14,"g":24,"l":10,"s":13,"u":13,"z":18}},"K":{"d":"135,0r0,-1515r149,0r0,824r617,-824r159,0r-434,569r489,946r-166,0r-417,-822r-248,327r0,495r-149,0","w":1140,"k":{"C":67,"G":67,"O":67,"Q":67,"S":41,"c":44,"e":44,"o":44,"q":44,"d":42,"f":43,"g":18,"s":12,"t":67,"u":14,"v":94,"w":88,"y":103}},"L":{"d":"135,0r0,-1515r148,0r0,1373r672,0r0,142r-820,0","w":980,"k":{"C":68,"G":68,"O":68,"Q":68,"S":14,"T":230,"U":38,"V":198,"W":128,"Y":223,"c":26,"e":26,"o":26,"q":26,"d":24,"f":39,"t":65,"u":9,"v":130,"w":102,"y":153}},"M":{"d":"128,0r0,-1515r268,0r324,1163r10,0r324,-1163r268,0r0,1515r-148,0r0,-1374r-10,0r-382,1374r-114,0r-382,-1374r-10,0r0,1374r-148,0","w":1457,"k":{"a":10,"b":10,"h":10,"k":10,"c":14,"e":14,"o":14,"q":14,"d":15,"i":10,"j":10,"m":10,"n":10,"p":10,"r":10,"g":19,"l":11,"s":10,"u":12}},"N":{"d":"128,0r0,-1515r236,0r611,1154r0,-1154r148,0r0,1515r-127,0r-720,-1368r0,1368r-148,0","w":1251,"k":{"a":10,"b":10,"h":10,"k":10,"c":14,"e":14,"o":14,"q":14,"d":15,"i":10,"j":10,"m":10,"n":10,"p":10,"r":10,"g":19,"l":11,"s":10,"u":12}},"O":{"d":"99,-977v51,-296,196,-555,539,-555v256,0,387,159,466,348v53,128,79,272,79,432v0,293,-78,508,-227,652v-122,118,-347,154,-520,72v-291,-138,-409,-533,-337,-949xm641,-1408v-270,5,-366,214,-400,456v-44,316,12,664,211,792v98,63,248,69,348,12v178,-100,235,-333,235,-604v0,-219,-40,-389,-121,-510v-53,-80,-145,-149,-273,-146","k":{"A":20,"J":17,"T":72,"V":21,"W":13,"X":58,"Y":55,"Z":38,"g":12,"x":22,"z":15}},"P":{"d":"664,-1515v278,-16,470,258,382,551v-48,160,-171,272,-382,272r-381,0r0,692r-148,0r0,-1515r529,0xm920,-1104v0,-201,-153,-287,-357,-287r-280,0r0,575r280,0v205,0,357,-86,357,-288","w":1136,"k":{"A":105,"J":231,"X":42,"Z":14,"a":27,"c":53,"e":53,"o":53,"q":53,"d":60,"m":9,"n":9,"p":9,"r":9,"g":54,"s":17}},"Q":{"d":"730,9v3,111,21,138,125,138r264,0r0,124r-129,0v-206,-3,-251,7,-336,-41v-68,-38,-70,-98,-72,-218v-264,-43,-408,-256,-470,-504v-82,-326,-2,-690,156,-874v79,-92,206,-168,370,-166v256,3,390,158,466,348v175,438,66,1110,-374,1193xm641,-1408v-270,5,-366,214,-400,456v-44,316,12,664,211,792v98,63,248,69,348,12v178,-100,235,-333,235,-604v0,-219,-40,-389,-121,-510v-53,-80,-145,-149,-273,-146","k":{"A":20,"J":17,"T":72,"V":21,"W":13,"X":58,"Y":55,"Z":38,"g":12,"x":22,"z":15}},"R":{"d":"1068,-1117v0,204,-105,369,-292,401r286,716r-162,0r-276,-692r-341,0r0,692r-148,0r0,-1515r510,0v231,-10,423,168,423,398xm920,-1110v0,-182,-156,-281,-366,-281r-271,0r0,575r376,0v162,-3,261,-113,261,-294","w":1093,"k":{"J":13,"T":41,"X":19,"Y":13,"a":18,"c":37,"e":37,"o":37,"q":37,"d":39,"m":11,"n":11,"p":11,"r":11,"g":31,"s":16,"u":15,"x":11}},"S":{"d":"499,-1408v-160,0,-277,106,-277,265v0,87,23,148,68,184v90,72,199,94,320,133v154,49,262,117,319,211v76,126,82,298,-3,435v-76,122,-182,196,-372,196v-286,0,-440,-174,-514,-384r137,-48v41,180,159,308,384,308v176,0,274,-106,279,-266v8,-250,-189,-286,-375,-351v-164,-57,-277,-124,-332,-210v-167,-262,44,-597,361,-597v270,0,376,167,442,367r-130,50v-36,-154,-117,-293,-307,-293","w":1033,"k":{"T":33,"V":11,"X":32,"Y":27,"f":29,"g":13,"s":11,"t":33,"v":29,"w":25,"x":37,"y":31,"z":20}},"T":{"d":"25,-1391r0,-124r1012,0r0,124r-432,0r0,1391r-148,0r0,-1391r-432,0","w":1062,"k":{"A":153,"C":72,"G":72,"O":72,"Q":72,"J":217,"S":18,"Y":-13,"a":179,"c":190,"e":190,"o":190,"q":190,"d":192,"i":41,"j":41,"m":189,"n":189,"p":189,"r":189,"f":76,"g":202,"l":9,"s":179,"t":62,"u":189,"v":165,"w":167,"x":176,"y":163,"z":170}},"U":{"d":"609,16v-290,0,-474,-184,-474,-471r0,-1060r148,0r0,1060v0,206,118,347,326,347v215,0,325,-128,325,-347r0,-1060r151,0r0,1060v-4,276,-183,471,-476,471","w":1213,"k":{"A":20,"J":10,"a":15,"c":14,"e":14,"o":14,"q":14,"d":15,"i":9,"j":9,"m":15,"n":15,"p":15,"r":15,"g":25,"l":10,"s":15,"u":14,"x":9,"z":19}},"V":{"d":"25,-1515r154,0r373,1256r373,-1256r154,0r-450,1515r-154,0","w":1104,"k":{"x":19,"v":16,"A":92,"C":21,"G":21,"O":21,"Q":21,"J":157,"a":95,"c":103,"e":103,"o":103,"q":103,"d":108,"m":67,"n":67,"p":67,"r":67,"f":16,"g":113,"s":84,"t":14,"u":62,"w":18,"y":14,"z":40}},"W":{"d":"25,-1515r154,0r259,1198r10,0r274,-1198r170,0r274,1198r10,0r259,-1198r154,0r-351,1515r-152,0r-274,-1198r-10,0r-274,1198r-152,0","w":1614,"k":{"A":72,"C":13,"G":13,"O":13,"Q":13,"J":105,"a":65,"c":81,"e":81,"o":81,"q":81,"d":83,"m":47,"n":47,"p":47,"r":47,"g":88,"s":54,"t":10,"u":43,"w":11,"x":9,"z":26}},"X":{"d":"25,0r437,-773r-419,-742r154,0r359,634r348,-634r154,0r-428,765r425,750r-156,0r-359,-636r-359,636r-156,0","w":1083,"k":{"v":81,"C":59,"G":59,"O":59,"Q":59,"S":32,"a":19,"c":66,"e":66,"o":66,"q":66,"d":63,"f":39,"g":31,"s":25,"t":45,"u":33,"w":77,"y":83}},"Y":{"d":"25,-1515r154,0r382,713r382,-713r154,0r-462,855r0,660r-148,0r0,-660","w":1122,"k":{"A":134,"C":55,"G":55,"O":55,"Q":55,"J":188,"S":13,"T":-13,"a":143,"c":180,"e":180,"o":180,"q":180,"d":187,"i":20,"j":20,"m":140,"n":140,"p":140,"r":140,"f":44,"g":184,"s":149,"t":42,"u":138,"v":78,"w":84,"x":85,"y":74,"z":105}},"Z":{"d":"68,0r0,-107r825,-1280r-771,0r0,-128r952,0r0,123r-794,1250r788,0r0,142r-1000,0","w":1142,"k":{"C":41,"G":41,"O":41,"Q":41,"a":13,"c":61,"e":61,"o":61,"q":61,"d":60,"m":18,"n":18,"p":18,"r":18,"f":40,"g":23,"s":20,"t":40,"u":33,"v":80,"w":78,"y":82}},"a":{"d":"370,13v-222,0,-351,-182,-280,-395v40,-120,142,-182,266,-227v88,-32,197,-60,325,-85v-1,-185,-53,-250,-218,-258v-111,-5,-227,84,-271,166r-95,-63v75,-143,202,-215,381,-215v230,0,335,130,335,367r0,549v-1,34,20,127,31,148r-133,0v-20,-10,-30,-66,-30,-168v-94,121,-198,181,-311,181xm372,-99v147,2,244,-100,309,-166r0,-317v-127,33,-202,53,-225,60v-117,38,-193,88,-227,150v-17,31,-25,71,-25,120v0,94,82,152,168,153","w":928,"k":{"W":71,"V":96,"T":195,"S":12,"B":14,"D":14,"E":14,"F":14,"H":14,"I":14,"K":14,"L":14,"M":14,"N":14,"P":14,"R":14,"C":10,"G":10,"O":10,"Q":10,"U":23,"Y":173,"f":15,"t":16,"v":13,"w":11,"y":16}},"b":{"d":"547,11v-153,7,-240,-92,-295,-177v0,103,-8,158,-25,166r-133,0v17,-37,26,-85,26,-146r0,-1369r132,0r0,598v29,-59,167,-149,271,-149v356,0,483,503,341,834v-60,140,-148,235,-317,243xm527,-101v200,0,260,-194,260,-409v0,-296,-99,-444,-298,-444v-87,0,-166,50,-237,151r0,525v67,93,127,147,178,164v25,9,58,13,97,13","w":994,"k":{"A":14,"B":15,"D":15,"E":15,"F":15,"H":15,"I":15,"K":15,"L":15,"M":15,"N":15,"P":15,"R":15,"S":9,"T":191,"U":15,"V":104,"W":82,"X":58,"Y":181,"Z":39,"f":20,"t":21,"v":12,"w":10,"x":40,"y":15,"z":21}},"c":{"d":"500,11v-306,0,-425,-214,-425,-531v0,-364,142,-546,425,-546v179,0,286,128,326,253r-106,48v-26,-99,-92,-189,-220,-189v-195,0,-293,142,-293,425v0,240,83,420,293,428v122,4,210,-120,241,-207r104,50v-51,133,-158,269,-345,269","w":926,"k":{"X":36,"W":54,"V":84,"T":213,"S":18,"C":15,"G":15,"O":15,"Q":15,"U":12,"Y":197,"c":9,"e":9,"o":9,"q":9,"d":10,"g":8,"x":28}},"d":{"d":"874,-146v-1,35,14,124,26,146r-133,0v-17,-8,-25,-63,-25,-166v-90,170,-278,229,-450,132v-207,-117,-270,-482,-170,-749v53,-140,171,-274,336,-283v117,-6,251,86,284,149r0,-598r132,0r0,1369xm479,-101v142,0,190,-83,263,-177r0,-525v-71,-101,-150,-151,-237,-151v-199,0,-298,148,-298,444v0,217,69,409,272,409","w":984,"k":{"T":9,"B":11,"D":11,"E":11,"F":11,"H":11,"I":11,"K":11,"L":11,"M":11,"N":11,"P":11,"R":11,"U":9}},"e":{"d":"844,-229v-54,110,-212,240,-339,240v-237,0,-360,-136,-405,-322v-92,-380,44,-844,470,-743v206,49,271,251,271,541r-634,0v0,178,45,299,135,364v45,32,94,48,149,48v103,0,190,-64,262,-191xm709,-625v0,-168,-69,-325,-234,-329v-174,-4,-263,144,-262,329r496,0","w":925,"k":{"Z":17,"X":31,"W":74,"V":96,"T":181,"S":15,"B":10,"D":10,"E":10,"F":10,"H":10,"I":10,"K":10,"L":10,"M":10,"N":10,"P":10,"R":10,"U":14,"Y":154,"f":13,"t":14,"v":9,"x":24,"y":12,"z":8}},"f":{"d":"186,-1278v-6,-159,118,-246,284,-246v52,0,81,3,87,9r0,111r-89,0v-100,0,-150,42,-150,126r0,223r239,0r0,112r-239,0r0,943r-132,0r0,-943r-173,0r0,-112r173,0r0,-223","w":570,"k":{"J":84,"A":65,"Y":-27,"a":9,"c":28,"e":28,"o":28,"q":28,"d":34,"g":30}},"g":{"d":"326,-343v-27,20,-107,75,-96,111v-3,84,120,86,188,92v165,15,398,22,490,134v39,48,62,101,62,165v0,191,-160,286,-479,286v-169,0,-330,-45,-409,-147v-61,-78,-46,-199,20,-248v47,-35,112,-70,162,-97v-84,-14,-161,-69,-166,-139v-7,-106,103,-156,159,-195v-74,-64,-154,-179,-151,-315v4,-211,174,-370,378,-370v125,0,171,32,251,83v81,-70,130,-79,238,-85v-2,39,4,86,-2,120v-114,0,-171,10,-171,31v51,100,73,123,76,228v6,211,-157,384,-372,384v-58,0,-117,-13,-178,-38xm256,43v-117,61,-106,218,24,259v128,40,279,38,410,16v76,-13,154,-65,148,-152v-12,-187,-264,-159,-443,-182v-71,27,-117,47,-139,59xm504,-954v-153,0,-266,112,-266,265v0,154,103,272,260,272v157,0,246,-121,246,-271v0,-149,-86,-266,-240,-266","w":1005,"k":{"j":-80,"T":160,"J":37,"Y":52}},"h":{"d":"737,-786v5,-93,-84,-168,-169,-168v-99,0,-201,58,-307,173r0,781r-132,0r0,-1515r132,0r0,633v99,-94,179,-152,243,-170v202,-56,365,54,365,266r0,786r-132,0r0,-786","w":979,"k":{"B":13,"D":13,"E":13,"F":13,"H":13,"I":13,"K":13,"L":13,"M":13,"N":13,"P":13,"R":13,"S":10,"T":193,"U":19,"V":93,"W":68,"Y":153,"y":8}},"i":{"d":"120,-1188r0,-150r150,0r0,150r-150,0xm129,0r0,-1055r132,0r0,1055r-132,0","w":417,"k":{"B":10,"D":10,"E":10,"F":10,"H":10,"I":10,"K":10,"L":10,"M":10,"N":10,"P":10,"R":10,"T":40,"U":9,"Y":19,"Z":10}},"j":{"d":"111,-1188r0,-150r150,0r0,150r-150,0xm-63,225v145,-5,183,-35,183,-196r0,-1084r132,0r0,1055v-1,147,-18,218,-71,280v-44,51,-139,60,-236,57","w":362,"k":{"B":10,"D":10,"E":10,"F":10,"H":10,"I":10,"K":10,"L":10,"M":10,"N":10,"P":10,"R":10,"T":40,"U":9,"Y":19,"Z":10}},"k":{"d":"130,0r0,-1515r132,0r0,982r404,-522r158,0r-276,359r338,696r-146,0r-282,-582r-196,243r0,339r-132,0","w":911,"k":{"W":29,"V":42,"T":184,"S":20,"C":32,"G":32,"O":32,"Q":32,"U":22,"Y":119,"a":8,"c":34,"e":34,"o":34,"q":34,"d":33,"g":17,"s":10}},"l":{"d":"129,2r0,-1517r132,0r0,1517r-132,0","w":417,"k":{"T":9,"B":11,"D":11,"E":11,"F":11,"H":11,"I":11,"K":11,"L":11,"M":11,"N":11,"P":11,"R":11,"U":10}},"m":{"d":"728,-786v5,-93,-84,-168,-169,-168v-99,0,-201,58,-307,173r0,781r-132,0r0,-1055r132,0r0,174v92,-92,173,-149,243,-170v33,-10,74,-15,123,-15v115,0,214,81,233,193v97,-97,180,-156,249,-177v199,-59,367,51,367,264r0,786r-132,0r0,-786v5,-93,-84,-168,-169,-168v-98,0,-200,58,-306,173r0,781r-132,0r0,-786","w":1577,"k":{"B":13,"D":13,"E":13,"F":13,"H":13,"I":13,"K":13,"L":13,"M":13,"N":13,"P":13,"R":13,"S":10,"T":193,"U":19,"V":93,"W":68,"Y":153,"y":8}},"n":{"d":"728,-786v5,-93,-84,-168,-169,-168v-99,0,-201,58,-307,173r0,781r-132,0r0,-1055r132,0r0,173v106,-97,178,-184,353,-184v154,0,255,108,255,280r0,786r-132,0r0,-786","w":970,"k":{"B":13,"D":13,"E":13,"F":13,"H":13,"I":13,"K":13,"L":13,"M":13,"N":13,"P":13,"R":13,"S":10,"T":193,"U":19,"V":93,"W":68,"Y":153,"y":8}},"o":{"d":"75,-534v0,-296,134,-532,412,-532v278,0,410,239,410,536v0,297,-133,541,-410,542v-278,1,-412,-250,-412,-546xm487,-100v223,0,278,-198,278,-427v0,-285,-93,-427,-279,-427v-186,0,-279,142,-279,426v0,211,55,345,165,402v33,17,72,26,115,26","w":972,"k":{"A":14,"B":15,"D":15,"E":15,"F":15,"H":15,"I":15,"K":15,"L":15,"M":15,"N":15,"P":15,"R":15,"S":9,"T":191,"U":15,"V":104,"W":82,"X":58,"Y":181,"Z":39,"f":20,"t":21,"v":12,"w":10,"x":40,"y":15,"z":21}},"p":{"d":"544,11v-103,0,-254,-93,-283,-151r0,550r-132,0r0,-1465r132,0r0,164v44,-84,186,-175,296,-175v226,0,383,260,383,519v0,184,-45,330,-135,439v-65,79,-152,119,-261,119xm536,-954v-117,0,-215,84,-275,175r0,525v63,93,187,192,337,142v159,-53,209,-204,210,-435v0,-167,-39,-284,-116,-352v-41,-37,-93,-55,-156,-55","w":1015,"k":{"A":14,"B":15,"D":15,"E":15,"F":15,"H":15,"I":15,"K":15,"L":15,"M":15,"N":15,"P":15,"R":15,"S":9,"T":191,"U":15,"V":104,"W":82,"X":58,"Y":181,"Z":39,"f":20,"t":21,"v":12,"w":10,"x":40,"y":15,"z":21}},"q":{"d":"754,-140v-27,56,-181,155,-278,151v-249,-10,-345,-186,-387,-397v-45,-228,16,-447,125,-568v66,-74,147,-112,244,-112v109,0,236,79,296,175r17,-164r115,0r0,1465r-132,0r0,-550xm480,-954v-206,0,-272,185,-273,400v-2,248,64,453,284,453v104,0,192,-51,263,-153r0,-525v-75,-103,-138,-175,-274,-175","w":996,"k":{"B":10,"D":10,"E":10,"F":10,"H":10,"I":10,"K":10,"L":10,"M":10,"N":10,"P":10,"R":10,"T":189,"U":16,"V":67,"W":47,"Y":140,"Z":10}},"r":{"d":"252,-771v74,-177,161,-307,362,-293r0,112v-93,13,-142,29,-201,78v-50,41,-104,124,-161,247r0,627r-132,0r0,-1055r132,0r0,284","w":639,"k":{"Z":138,"X":100,"T":181,"J":175,"A":93,"Y":55,"a":13,"c":39,"e":39,"o":39,"q":39,"d":47,"g":38}},"s":{"d":"798,-292v0,174,-164,306,-335,303v-200,-3,-298,-78,-383,-211r99,-64v65,97,132,160,277,163v108,2,208,-59,210,-161v3,-239,-280,-201,-423,-291v-81,-51,-149,-124,-149,-243v0,-164,156,-270,332,-270v133,0,257,69,326,168r-91,68v-66,-68,-107,-124,-253,-124v-88,0,-184,63,-186,139v-5,171,192,186,306,228v88,32,186,73,231,147v27,45,39,95,39,148","w":878,"k":{"X":17,"W":67,"V":96,"T":181,"B":10,"D":10,"E":10,"F":10,"H":10,"I":10,"K":10,"L":10,"M":10,"N":10,"P":10,"R":10,"C":11,"G":11,"O":11,"Q":11,"U":15,"Y":148,"x":15}},"t":{"d":"460,13v-202,0,-246,-93,-246,-287r0,-669r-178,0r0,-112r178,0r0,-385r132,0r0,385r242,0r0,112r-242,0r0,669v1,122,24,171,133,175v20,1,97,-8,109,-11r0,99v-44,16,-86,24,-128,24","w":606,"k":{"V":9,"T":114,"Y":50,"c":8,"e":8,"o":8,"q":8,"d":10}},"u":{"d":"494,-4v-200,58,-365,-53,-365,-265r0,-786r132,0r0,786v-5,93,84,168,169,168v99,0,201,-58,307,-173r0,-781r132,0r0,1055r-132,0r0,-174v-95,93,-175,150,-243,170","w":979,"k":{"B":10,"D":10,"E":10,"F":10,"H":10,"I":10,"K":10,"L":10,"M":10,"N":10,"P":10,"R":10,"T":189,"U":16,"V":67,"W":47,"Y":140,"Z":10}},"v":{"d":"25,-1055r138,0r278,909r19,0r278,-909r138,0r-324,1055r-203,0","w":901,"k":{"Z":106,"X":87,"V":16,"T":165,"J":90,"A":56,"Y":78,"c":11,"e":11,"o":11,"q":11,"d":14,"g":15}},"w":{"d":"25,-1055r123,0r232,795r208,-795r120,0r226,800r222,-800r135,0r-301,1055r-118,0r-224,-809r-201,809r-135,0","w":1316,"k":{"Z":105,"X":85,"W":10,"V":18,"T":167,"J":78,"A":53,"Y":82,"c":10,"e":10,"o":10,"q":10,"d":12,"g":14}},"x":{"d":"25,0r330,-544r-320,-511r148,0r245,390r256,-390r148,0r-332,505r345,550r-148,0r-267,-425r-257,425r-148,0","w":870,"k":{"W":9,"V":19,"T":180,"S":20,"C":26,"G":26,"O":26,"Q":26,"Y":84,"a":18,"c":46,"e":46,"o":46,"q":46,"d":47,"g":29,"s":18}},"y":{"d":"274,378v-77,21,-163,18,-247,7r10,-121v45,23,148,22,195,2v102,-42,150,-146,172,-263r-379,-1058r142,0r299,859r280,-859r134,0r-368,1119v-38,114,-76,191,-114,232v-42,44,-83,72,-124,82","w":905,"k":{"Z":108,"X":91,"V":15,"T":165,"J":95,"A":61,"Y":76,"c":13,"e":13,"o":13,"q":13,"d":16,"g":16}},"z":{"d":"25,0r0,-85r560,-858r-507,0r0,-112r676,0r0,74r-568,861r568,0r0,120r-729,0","w":779,"k":{"W":18,"V":30,"T":174,"C":10,"G":10,"O":10,"Q":10,"U":15,"Y":102,"c":21,"e":21,"o":21,"q":21,"d":22,"g":8}},"\u00a0":{}}});

