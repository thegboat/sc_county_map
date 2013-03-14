/*
 * jQuery UI County Map
 *
 * Author: Grady Griffin
 * Version: 0.3.1
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

  paint : function(shapes, color){
    this.painted = this.painted || {}
    var shape_ids = this._parse_shape_collection(shapes)
    for(var i in shape_ids){
      var shape_id = shape_ids[i]
      var entity = this.entities[shape_id]
      if(!entity) continue;
      this.painted[shape_id] = true
      this._change_color(entity, color)
    }
  },

  unpaint : function(shapes){
    if(!this.painted) return false;
    if(shapes){
      var shape_ids = this._parse_shape_collection(shapes)
      for(var i in shape_ids){
        this._unpaint_one(shape_ids[i]);
      }
    }else{
      for(var shape_id in this.painted){
        this._unpaint_one(shape_id);
      }
    }
  },

  label : function(text){
    text = String(text || '')
    this.header_text.attr({text : text})
  },

  add_to : function(group_name, options){
    options = options || {}
    group_name = group_name.trim()
    this.groups[group_name] = this.groups[group_name] || {}
    this._set_color(group_name, options.colors)
    this.clickable[group_name] = !!options.clickable
    this._manage_group(group_name, options.shapes, true)
    if(options.clickable){
      this.clickable[group_name] = true 
    }else if(options.clickable == false){
      delete this.clickable[group_name]
    }
    return this[group_name]
  },

  remove_from : function(group_name, shapes){
    if(!this.groups[group_name]) return null;
    if(shapes){
      this._manage_group(group_name, shapes)
    }
    else{
      for(shape in this.groups[group_name]) { this._manage_group(group_name, shape)}
    }
    return this[group_name]
  },

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
    this.core.push(this.header_text);

    this._create_translation_table();

    this._make_groups();
    this._set_colors();
    var to_hlight = this._parse_group('selected');
    this.entities = this._base_entities(true);
    this._draw_shapes();
    this._set_clickable();
    if(to_hlight) this._clicked(this.entities[to_hlight])

    this.core.toFront();
    this.paper.safari();
  },

  _draw_shapes : function(){
    var entity, paths = this._base_paths();
    for(var entity_name in this.entities){
      this._draw_shape(entity_name, paths);
    }
  },

  _draw_shape : function(entity_name, paths){
    paths = paths || this._base_paths();
    var entity = this.entities[entity_name.trim()];
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

  _stroke_path : function(path,reverse){
    for(var coords in path){
      var idx = reverse ? ((path.length-1) - coords) : coords;
      this.pen += (!this.pen ? 'M' : 'L');
      this.pen += [this._scaled(path[idx][0]),this._scaled(path[idx][1])].join(',');
    }
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
      map._check_cursor(entity)
      map.unpaint();
      if(!map._is_in_group('selected',entity)){
        var color = map._get_color(entity, true)
        entity.shape.animate({fill: color, stroke: map.colors.edge}, 200);
        map.header_text.attr({text : entity.title});
        map.paper.safari();
      }
    });
    var mout = (function(){
      map._check_cursor(entity)
      map.unpaint();
      if(!map._is_in_group('selected',entity)){
        entity.shape.animate({fill: map._get_color(entity), stroke: map.colors.edge}, 200);
        text = map.highlighted ? map.highlighted.title : '';
        map.header_text.attr({text : text});
        map.paper.safari();
      }
    });
    entity.shape.hover(mover,mout);
    entity.label.hover(mover,mout);
    entity.shape.click(function(){map._clicked(entity)});
    entity.label.click(function(){map._clicked(entity)});
  },

  _clicked : function(entity){
    if(!this._is_clickable(entity)) return false;
    var other = this.highlighted;
    this.highlighted = entity;
    this.unpaint();

    if(this.options.multiselect){
      if(this.highlighted == other){
        this._remove_from('selected', this.highlighted, true);
      }else{
        this._add_to('selected', this.highlighted);
      }
    }
    else{
      this._add_to('selected', this.highlighted);
      if(other != this.highlighted) this._remove_from('selected', other);
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

  _set_clickable : function(){
    this.clickable = {}
    if(/(^|,)\s*all\s*($|,)/i.test(this.options.clickable)){
      for(var group_name in this.groups){
        this.clickable[group_name] = true
      }
    }else{
      var group_names = this.options.clickable.split(',');
      for(var i in group_names){
        this.clickable[group_names[i]] = true
      }
    }
  },

  _is_clickable : function(entity){
    var click_group = entity.click_group
    if(this.clickable[click_group] && this.groups[click_group][entity.name]) return true
    for(var group_name in this.clickable){
      if(this.groups[group_name][entity.name]){
        entity.click_group = group_name
        return true
      }
    }
    if(click_group) delete entity.click_group
    return false
  },

  _check_cursor : function(entity){
    var clickable = this._is_clickable(entity)
    var label = $(entity.label.node)
    if(clickable && label.css('cursor')){
      entity.shape.forEach(function(obj){ $(obj.node).css('cursor', 'pointer') });
      label.css('cursor', 'pointer');
    }else if(!clickable && label.css('cursor')){
      entity.shape.forEach(function(obj){ $(obj.node).css('cursor', false) });
      label.css('cursor', false);
    }
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
      this._set_color(group_name)
    }
  },

  _set_color : function(group_name, colors){
    if(colors){
      this.colors[group_name] = colors.split(',')
    }
    else if(this.options["color-"+group_name]){
      this.colors[group_name] = this.options["color-"+group_name].split(',')
    }
    else{
      this.colors[group_name] = this.colors[group_name] || this.colors.fill
    }
  },

  _make_groups : function(){
    this.groups = {members : {}}
    this._parse_group('members')
    entities = this._base_entities()
    for(var group_name in this.options){
      if(/^group-[A-Za-z0-9]/.test(group_name)){
        this._parse_group(group_name, entities)
      }
    }
  },

  _parse_group : function(key, entities){
    var shape_ids = this._parse_shape_collection(this.options[key])
    var group_name = key.replace(/^group-/,'').trim(), first = null;
    this.groups[group_name] = {}
    if(shape_ids.length){
      entities = entities || this._base_entities();
      for(i in shape_ids){
        var val = null;
        if(entities[shape_ids[i]]) val = shape_ids[i];
        if(val){
          this.groups[group_name][val] = true;
          first = first || val
          if(key == 'selected' && !this.multiselect) break;
        }
      }
    }
    return first;
  },

  _is_in_group : function(group_name, entity){
    return !!(this.groups[group_name] && this.groups[group_name][entity.name])
  },

  _get_group : function(entity){
    if(this._is_in_group('selected', entity)) return 'highlighted'
    if(this._is_in_group('members', entity)) return 'members'
    for(var group_name in this.groups){
      if(this.groups[group_name][entity.name]) return group_name
    }
    return null
  },

  _get_color : function(entity, hovering){
    group_name = this._get_group(entity)
    if(group_name){
      var l = this.colors[group_name].length
      return (hovering ? this.colors[group_name][l-1] : this.colors[group_name][0])
    }
    return (hovering ? this.colors.fill[1] : this.colors.fill[0])
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
    if(!entity.info_selector){
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
    return null;
  },

  _add_to : function(group_name, entity){
    if(!entity) return false
    this.groups[group_name][entity.name] = true;
    var color = this._get_color(entity)
    this._change_color(entity, color)
    if(group_name == 'selected'){
      var input = this._get_form_input(entity)
      if(input) input.prop('checked', true);
    }
    return true
  },

  _remove_from : function(group_name, entity, hovering){
    if(!entity) return false
    delete this.groups[group_name][entity.name]
    var color = this._get_color(entity,hovering)
    this._change_color(entity, color)
    if(group_name == 'selected'){
      var input = this._get_form_input(entity)
      if(input) input.prop('checked', false);
    }
    return true
  },

  _manage_group : function(group_name, shapes, adding){
    if(!this.groups[group_name]) return false
    var shape_ids = this._parse_shape_collection(shapes)
    for(var i in shape_ids){
      var entity = this.entities[shape_ids[i]]
      adding ? this._add_to(group_name, entity) : this._remove_from(group_name, entity);
    }
    return true
  },

  _parse_shape_collection : function(shapes){
    shapes = String(shapes || '')
    if(!shapes.trim()) return []
    var map = this
    return shapes.split(',').map(function(x){
      var shape = x.trim()
      shape = map.translation_table[shape] || shape
      return shape;
    })
  },

  _change_color : function(entity, color){
    if(entity.shape.attr('fill') != color){
      entity.shape.attr({fill: color, stroke: this.colors.edge});
    }
  },

  _scaled : function(val){
    return val * this.options.scale;
  },

  _unpaint_one : function(shape_id){
    shape_id = shape_id.trim()
    if(!this.painted[shape_id]) return false;
    delete this.painted[shape_id];
    var entity = this.entities[shape_id];
    if(!entity) return false;
    this._change_color(entity, this._get_color(entity));
    return true;
  },

  _create_translation_table : function(){
    this.translation_table = this.options['translation-table']
    this.translation_table = this.translation_table || (this._translation_table ? this._translation_table() : {});
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
      1 : [[85, 213],[72, 212], [72, 209], [66, 203], [59, 196], [54, 190], [55, 190], [56, 188], [52, 187], [47, 187], [45, 186], [43, 185], [34, 177], [32, 176], [29, 173], [26, 172], [25, 168], [22, 161], [27, 161], [28, 156], [30, 153], [29, 145], [38, 146], [38, 140], [42, 140], [45, 133], [49, 132], [50, 130], [54, 127], [57, 124], [60, 123], [65, 122], [63, 119], [67, 109], [98, 99]],
      // "oconee-anderson" 
      2 : [[113, 179], [85, 213]],
      // "oconee-pickens" 
      3 : [[98, 99], [93, 111], [97, 122], [98, 136], [99, 150], [103, 153], [99, 158], [99, 163], [106, 165], [102, 175], [113, 179]],
      // "pickens" 
      4 : [[98, 99], [104, 97], [112, 94], [120, 93], [120, 93], [119, 97], [124, 98]],
      // "pickens-greenville" 
      5 : [[170, 147], [167, 143], [167, 141], [167, 133], [165, 131], [162, 125], [161, 120], [162, 118], [158, 116], [159, 108], [150, 109], [152, 103], [149, 99], [150, 98], [154, 97], [144, 98], [135, 98], [124, 98]],
      // "pickens-anderson" 
      6 : [[113, 179], [118, 175], [153, 155], [155, 153], [170, 147]],
      // "greenville" 
      7 : [[124, 98], [124, 97], [129, 92], [134, 89], [134, 91], [137, 85], [140, 86], [155, 80], [159, 78], [164, 80], [166, 76], [171, 76], [174, 76], [175, 77], [177, 76], [180, 74], [178, 72], [185, 69], [185, 70], [186, 72], [187, 73], [187, 73], [190, 75], [200, 71], [204, 71], [214, 72]],
      // "greenville-spartanburg" 
      8 : [[214, 72], [213, 94], [213, 109], [212, 130], [211, 132], [210, 138], [212, 140], [213, 143], [224, 153]],
      // "greenville-laurens" 
      9 : [[224, 153], [210, 191], [208, 197], [209, 201], [207, 204], [206, 207], [199, 212], [197, 212], [194, 212], [196,214]],
      // "greenville-anderson" 
      10 : [[196,214], [188, 207], [186, 205], [180, 200], [179, 198], [178, 196], [178, 194], [176, 188], [175, 189], [173, 180], [172, 170], [172, 167], [172, 166], [172, 164], [173, 158], [170, 147]],
      // "spartanburg" 
      11 : [[214, 72], [271, 75]],
      // "spartanburg-cherokee" 
      12 : [[297, 128], [291, 125], [290, 121], [287, 116], [287, 107], [282, 104], [282, 95], [274, 83], [271, 75]],
      // "spartanburg-union" 
      13 : [[297, 128], [294, 131], [294, 134], [287, 139], [284, 147], [280, 167], [274, 185], [273, 189], [274, 190], [271, 195]],
      // "spartanburg-laurens" 
      14 : [[271, 195], [269, 193], [265, 192], [263, 190], [261, 188], [259, 184], [256, 182], [252, 179], [237, 176], [236, 162], [228, 161], [224, 153]],
      // "cherokee" 
      15 : [[271, 75], [353, 79]],
      // "cherokee-union" 
      16 : [[337, 142], [333, 138], [330, 135], [326, 138], [318, 135], [313, 134], [312, 139], [308, 131], [300, 131], [297, 128]],
      // "cherokee-york" 
      17 : [[353, 79], [347, 91], [348, 87], [348, 102], [345, 102], [339, 101], [337, 102], [332, 106], [335, 112], [335, 117], [334, 121], [334, 122], [338, 136], [337, 142]],
      // "york"
      18 : [[353, 79], [404, 82], [407, 83], [409, 88], [410, 91], [404, 95], [406, 97], [408, 104], [413, 101], [415, 99], [420, 96], [421, 95], [424, 92], [426, 93], [431, 98]],
      // "york-chester"
      19 : [[335, 149], [433, 149]],
      // "york-lancaster"
      20 : [[433, 149], [434, 150], [434, 149], [434, 146], [437, 145], [437, 143], [437, 135], [437, 131], [438, 130], [438, 126], [437, 118], [435, 118], [433, 113], [433, 110], [433, 104], [433, 101], [431, 98]],
      // "york-union"
      21 : [[335, 149], [337, 142]],
      // "lancaster"
      22 : [[431, 98], [445, 117], [450, 125], [450, 149], [463, 149], [480, 150], [492, 150]],
      // "lancaster-chester"
      23 : [[439, 203],[436, 201], [435, 190], [434, 186], [434, 184], [435, 181], [436, 177], [439, 175], [438, 171], [437, 164], [436, 156], [436, 153], [433, 149]],
      // "lancaster-fairfield"
      24 : [[438, 220], [436, 219], [434, 218], [434, 216], [435, 214], [439, 203]],
      // "lancaster-kershaw"
      25 : [[513, 190], [497, 197], [491, 202], [495, 211], [488, 214], [489, 216], [483, 212], [483, 214], [477, 213], [477, 214], [473, 217], [470, 214], [465, 207], [465, 213], [460, 217], [459, 216], [460, 205], [454, 208], [448, 212], [443, 216], [441, 217], [438, 220]],
      // "lancaster-chesterfield"
      26 : [[492, 150], [498, 166], [513, 187],[513, 190]],
      // "chesterfield"
      27 : [[492, 150], [593, 151]],
      // "chesterfield-kershaw"
      29 : [[536, 238], [534, 232], [531, 229], [529, 225], [528, 214], [527, 210], [524, 208], [522, 204], [519, 198], [519, 192], [513,190]],
      // "chesterfield-darlington"
      30 : [[608, 207], [603, 212], [601, 212], [589, 215], [585, 212], [573, 215], [536, 238]],
      // "chesterfield-malboro"
      31 : [[608, 207], [614, 201], [615, 192], [621, 190], [618, 182], [613, 180], [608, 178], [606, 174], [600, 164], [594, 159], [593, 151]],
      // "malboro"
      32 : [[593, 151], [637, 152], [676, 190]],
      // "malboro-darlington"
      33 : [[639, 248], [639, 248], [636, 243], [639, 237], [636, 236], [637, 232], [631, 231], [625, 219], [629, 220], [629, 211], [628, 214], [624, 208], [622, 208], [620, 212], [619, 212], [615, 214], [608, 207]],
      // "malboro-dillon"
      34 : [[676, 190], [646, 252]],
      // "malboro-florence"
      35 : [[646, 252], [639, 248] ],
      // "dillon"
      36 : [[738, 250], [676, 190]],
      // "dillon-florence"
      37 : [[655, 261], [655, 255], [646, 252]],
      // "dillon-marion"
      38 : [[731, 259], [728, 258], [723, 254], [722, 255], [718, 255], [715, 260], [710, 259], [704, 256], [700, 255], [700, 256], [696, 255], [691, 253], [688, 250], [683, 251], [681, 251], [672, 253], [671, 254], [668, 256], [664, 261], [660, 261], [655, 261]],
      // "dillon-horry"
      39 : [[738, 250], [731, 259]],
      // "horry"
      40 : [ [738, 250], [828, 339], [818, 342], [801, 348], [802, 348], [789, 359], [780, 367], [772, 374], [769, 379], [762, 387], [761, 389], [757, 394], [755, 395]],
      // "horry-marion"
      41 : [[721, 370], [719, 360], [707, 358], [712, 345], [709, 344], [709, 340], [710, 337], [708, 334], [705, 330], [700, 331], [702, 325], [700, 325], [697, 317], [702, 306], [705, 304], [708, 302], [710, 299], [712, 294], [709, 294], [716, 290], [717, 278], [721, 277], [726, 270], [728, 271], [731, 259]],
      // "horry-georgetown"
      42 : [[755, 395], [752, 397], [737, 397], [737, 389], [735, 391], [734, 391], [733, 386], [733, 380], [728, 380], [729, 376], [721, 370]],
      // "georgetown"
      43 : [[755, 395],[745, 412], [740, 418], [736, 429], [730, 440], [726, 461], [727, 471], [725, 467], [724, 464], [724, 460], [723, 457], [724, 453], [721, 452], [719, 450], [714, 451], [712, 451], [716, 439], [709, 439], [708, 442], [707, 451], [708, 454], [710, 459], [720, 463], [722, 465], [723, 467], [722, 473], [722, 476], [726, 476], [723, 481], [715, 488], [710, 491]],
      // "georgetown-marion"
      44 : [[700, 357], [703, 363], [705, 373], [714, 373], [721, 370]],
      // "georgetown-williamsburg"
      45 : [[640, 453], [640, 448], [641, 445], [646, 441], [648, 437], [653, 430], [656, 422], [662, 416], [665, 413], [667, 412], [669, 410], [679, 399], [681, 396], [679, 395], [681, 389], [682, 378], [692, 364], [695, 361], [695, 359], [700, 357]],
      // "georgetown-charleston"
      46 : [[710, 491], [710, 488], [710, 486], [707, 485], [704, 483], [699, 484], [695, 481], [689, 478], [684, 472], [679, 471]],
      // "georgetown-berkeley"
      47 : [[679, 471], [678, 466], [675, 464], [667, 467], [665, 462], [659, 459], [648, 455], [644, 454], [640, 453]],
      // "charleston"
      48 : [[710, 491], [707, 494], [701, 493], [697, 498], [693, 501], [695, 504], [693, 506], [692, 509], [686, 510], [683, 511], [682, 507], [682, 507], [679, 505], [677, 512], [675, 512], [672, 507], [672, 506], [667, 506], [665, 510], [664, 509], [661, 511], [659, 513], [658, 515], [656, 517], [652, 524], [650, 529], [661, 529], [659, 535], [651, 537], [646, 541], [636, 547], [639, 549], [633, 554], [622, 559], [619, 561], [612, 567], [610, 570], [608, 573], [607, 578], [605, 580], [595, 588], [592, 589], [589, 593], [587, 594], [584, 595], [581, 593], [572, 597], [568, 598], [560, 603], [558, 602], [553, 602], [551, 598], [548, 595], [546, 593], [545, 593], [543, 591], [540, 592], [554, 603], [552, 605], [551, 608], [548, 609], [543, 612], [541, 607], [535, 614], [527,611], [531, 618]],
      // "charleston-berkeley"
      49 : [[564, 520], [567, 519], [573, 516], [576, 517], [579, 519], [579, 531], [584, 534], [586, 536], [590, 535], [593, 534], [590, 547], [597, 540], [598, 552], [603, 551], [604, 549], [604, 544], [611, 540], [613, 540], [614, 532], [625, 528], [627, 518], [627, 518], [641, 499], [644, 496], [646, 490], [649, 489], [660, 484], [662, 484], [664, 485], [666, 484], [670, 483], [671, 472], [679, 471]],
      // "charleston-dorchester"
      50 : [[519, 545], [535, 546], [562, 553], [557, 545], [565, 537], [571, 539], [572, 531], [564, 520]],
      // "charleston-colleton"
      51 : [[531, 618], [516, 608], [520, 601], [521, 600], [520, 592], [515, 595], [514, 592], [518, 590], [519, 589], [521, 585], [514, 583], [517, 580], [515, 576], [514, 573], [512, 571], [510, 570], [511, 555], [519, 556], [519, 545]],
      // "colleton"
      52 : [[531, 618], [518, 623], [511, 614], [508, 620], [503, 615], [495, 608]],
      // "colleton-dorchester"
      53 : [[449, 480], [461, 483], [466, 486], [468, 491], [472, 495], [478, 503], [486, 507], [496, 503], [505, 504], [511, 505], [519, 507], [517, 511], [515, 516], [514, 521], [514, 524], [516, 526], [517, 530], [519, 545]],
      // "colleton-bamberg"
      54 : [[403, 511], [427, 497], [431, 505], [434, 505], [436, 495], [436, 500], [435, 491], [442, 485], [449, 480]],
      // "colleton-hampton"
      55 : [[444, 574], [432, 549], [428, 543], [423, 540], [419, 536], [412, 524], [403, 511]],
      // "colleton-beaufort"
      56 : [[495, 608], [505, 600], [495, 599], [495, 604], [488, 603], [489, 600], [488, 599], [480, 600], [473, 593], [476, 595], [474, 587], [471, 588], [470, 585], [473, 582], [464, 582], [467, 581], [462, 580], [458, 580], [453, 580], [447, 577], [444, 574]],
      // "beaufort-1// "
      57 : [[495, 608], [499, 617], [506, 620], [505, 625], [497, 624], [491, 623], [485, 629], [489, 628], [501, 626], [505, 629], [507, 630], [508, 634], [510, 636], [502, 639], [497, 643], [493, 647], [495, 652], [491, 652], [490, 657], [488, 660], [484, 663], [482, 664], [480, 667], [478, 664], [477, 662], [478, 656], [478, 654], [478, 649], [476, 647], [474, 645], [473, 659], [466, 656], [467, 653], [463, 649], [458, 644], [456, 641], [452, 630], [450, 626], [447, 623]], 
      // "beaufort-2// "
      58 : [[474, 632], [471, 632], [472, 643], [473, 638], [475, 642], [473, 632], [479, 633], [474, 628], [474, 632]],
      // "beaufort-3// "
      59 : [[447, 623], [446, 628], [448, 634], [450, 642], [454, 648], [458, 652], [461, 653], [464, 659], [452, 654], [455, 648], [445, 643], [449, 651], [450, 648], [449, 659], [440, 655], [443, 661], [450, 663], [452, 655], [455, 657], [456, 660], [459, 662], [463, 666], [468, 665], [471, 672], [472, 675], [469, 678], [468, 682], [466, 684], [464, 687], [462, 689], [459, 692], [450, 695], [446, 696], [450, 683], [458, 683], [452, 672], [452, 677], [445, 676], [443, 673], [437, 678], [442, 678], [445, 678], [451, 682], [438, 693], [444, 690], [443, 698], [441, 701], [433, 700]], 
      // "beaufort-jasper"
      60 : [[433, 700], [434, 695], [430, 694], [432, 690], [425, 690], [424, 687], [424, 684], [423, 682], [420, 678], [415, 678], [414, 673], [413, 669], [416, 667], [417, 664], [417, 661], [416, 659], [416, 657], [428, 658], [428, 644], [431, 647], [438, 649], [446, 634], [442, 634], [444, 628], [446, 628], [447, 623], [444, 615], [444, 612], [444, 605], [446, 600], [442, 594], [439, 585]],
      // "beaufort-4// "
      61 : [[470, 643], [471, 644], [471, 643], [470, 643]], 
      // "beaufort-5// "
      62 : [[469, 644], [470, 645], [470, 644], [469, 644]],
      // "beaufort-6// "
      63 : [[470, 645], [471, 646], [471, 645], [470, 645]], 
      // "beaufort-7// "
      64 : [[472, 646], [473, 647], [473, 646], [472, 646]],
      // "beaufort-hampton"
      65 : [[439, 585], [444, 577], [444, 574]],
      // "jasper"
      66 : [[433, 700], [431, 701], [431, 701], [436, 705], [432, 710], [435, 712], [427, 711], [428, 709], [423, 705], [419, 702], [416, 699], [413, 698], [411, 701], [408, 700], [405, 700], [399, 695], [396, 694], [395, 684], [398, 684], [397, 678], [393, 676], [390, 672], [391, 668], [391, 665], [394, 663], [394, 660], [395, 658], [394, 655], [394, 654], [392, 647], [391, 648], [388, 644], [382, 634], [380, 628], [383, 627], [382, 624], [380, 619], [377, 620], [377, 614], [365, 609]],
      // "jasper-hampton"
      67 : [[365, 609], [368, 605], [376, 599], [400, 578], [402, 576], [409, 569], [412, 569], [416, 569], [421, 577], [425, 580], [424, 581], [422, 585], [423, 586], [423, 589], [431, 592], [434, 593], [437, 587], [439, 587], [439, 585]],
      // "hampton"
      68 : [[365, 609], [359, 603], [356, 602], [347, 595], [347, 592], [346, 590], [348, 588], [348, 586], [348, 581], [346, 578], [344, 576], [347, 572], [345, 572], [347, 567]],
      // "hampton-allendale"
      69 : [[347, 567], [351, 567], [356, 563], [358, 562], [360, 559], [362, 557], [364, 555], [368, 552], [369, 549], [373, 543], [365, 537], [376, 536], [376, 534], [375, 531], [376, 530], [378, 525], [388, 519], [393, 517], [396, 515], [403, 511]],
      // "allendale"
      70 : [[347, 567], [344, 560], [344, 553], [345, 549], [339, 546], [338, 541], [338, 541], [335, 539], [337, 534], [332, 532], [330, 524], [335, 516], [329, 507], [321, 507], [321, 503], [313, 498]],
      // "allendale-bamberg"
      71 : [[380, 493], [385, 494], [389, 500], [393, 503], [396, 507], [397, 506], [403, 511]],
      // "allendale-barnwell"
      72 : [[313, 498], [314, 495], [314, 494], [317, 492], [318, 489], [322, 486], [325, 485], [327, 485], [332, 487], [335, 488], [342, 490], [350, 494], [359, 495], [380, 493]],
      // "barnwell"
      73 : [[313, 498], [310, 495], [309, 496], [308, 496], [303, 496], [290, 488], [287, 484], [283, 477], [287, 475]],
      // "barnwell-aiken"
      74 : [[287, 475], [294, 470], [352, 418]],
      // "barnwell-orangeburg"
      75 : [[352, 418], [354, 418], [356, 419], [358, 419], [360, 420], [363, 419], [366, 421], [371, 424], [370, 426], [378, 428]],
      // "barnwell-bamberg"
      76 : [[378, 428], [380, 493]],
      // "aiken"
      77 : [[287, 475], [286, 471], [279, 473], [281, 472], [272, 466], [276, 464], [270, 456], [273, 453], [267, 453], [262, 445], [258, 444], [258, 444], [257, 442], [260, 441], [259, 433], [262, 434], [259, 430], [265, 422], [252, 419], [249, 416], [248, 414], [246, 409], [246, 407]],
      // "aiken-orangeburg"
      78 : [[386, 390], [352, 418]],
      // "aiken-lexington"
      79 : [[319, 340], [329, 351], [339, 358], [346, 368], [359, 371], [386, 390]],
      // "aiken-saluda"
      80 : [[304, 353] , [319, 340]],
      // "aiken-edgefield"
      81 : [[246, 407], [304, 353]],
      // "edgefield"
      82 : [[246, 407], [236, 397], [233, 399], [230, 395]],
      // "edgefield-saluda"
      83 : [[247, 321], [265,317], [265, 323], [267, 333], [270, 336], [275, 343], [295, 349], [304, 353]],
      // "edgefield-greenwood"
      84 : [[239, 323], [247, 321]],
      // "edgefield-mccormick"
      85 : [[230, 395], [227, 391], [232, 389], [228, 384], [224, 378], [218, 376], [217, 368], [220, 363], [219, 354], [229, 349], [222, 338], [222, 328], [239, 323]],
      // "mccormick"
      86 : [[230, 395], [224, 396], [216, 390], [214, 386], [213, 385], [214, 383], [212, 380], [208, 373], [207, 370], [207, 366], [205, 363], [198, 356], [195, 351], [192, 348], [185, 343], [182, 341], [178, 339], [176, 339], [173, 337], [162, 330], [163, 323], [155, 324], [150, 315], [150, 313], [149, 311], [149, 310]],
      // "mccormick-greenwood"
      87 : [[193, 300], [196, 319], [208, 311], [214, 322], [219, 316], [227, 317], [240, 318], [239, 323]],
      // "mccormick-abbeville"
      88 : [[149, 310], [150, 305], [156, 300], [160, 299], [168, 296], [167, 299], [175, 300], [185, 302], [184, 301], [193, 300]],
      // "abbeville"
      89 : [[149, 310], [145, 303], [143, 301], [140, 298], [140, 288], [131, 285], [128, 281], [126, 278], [125, 272], [125, 269]],
      // "abbeville-anderson"
      90 : [[125, 269], [196,214]],
      // "abbeville-laurens"
      91 : [[196,214], [206, 229]],
      // "abbeville-greenwood"
      92 : [[206, 229], [193, 239], [193, 245], [193, 246], [195, 248], [195, 250], [196, 252], [195, 254], [197, 256], [198, 259], [201, 261], [204, 266], [209, 274], [207, 285], [200, 292], [193, 300]],
      // "anderson"
      93 : [[125, 269], [124, 264], [124, 260], [122, 258], [117, 250], [115, 243], [113, 240], [110, 239], [109, 235], [106, 229], [106, 218], [100, 214], [96, 212], [89, 213], [85, 213]],
      // "laurens-union"
      94 : [[271, 195], [276, 193], [277, 196], [282, 197], [282, 199], [286, 198], [287, 199], [292, 201], [296, 202], [303, 201], [305, 206], [307, 209]],
      // "laurens-greenwood"
      95 : [[257, 271], [250, 265], [244, 261], [234, 253], [221, 245], [217, 240], [206, 229]],
      // "laurens-newberry"
      96 : [[257, 271], [263, 263], [267, 253], [277, 245], [283, 241], [293, 227], [298, 221], [307, 209]],
      // "greenwood-saluda"
      97 : [[247, 321], [269, 285]],
      // "greenwood-newberry"
      98 : [[269, 285], [265, 282], [264, 281], [265, 277], [257, 271]],
      // "newberry-richland"
      99 : [[358,274], [364, 262]],
      // "union-chester"
      100 : [[335, 149], [335, 151], [336, 152], [337, 152], [343, 158], [336, 162], [335, 165], [334, 166], [334, 167], [335, 169], [339, 168], [340, 179], [345, 188], [344, 197]],
      // "union-fairfield"
      101 : [[344, 197], [345, 215]],
      // "union-newberry"
      102 : [[307, 209], [312, 209], [318, 213], [321, 217], [321, 217], [323, 219], [322, 222], [324, 223], [326, 224], [328, 221], [330, 220], [336, 215], [337, 215], [345, 215]],
      // "chester-fairfield"
      103 : [[439, 203], [344, 197]],
      // "fairfield-newberry"
      104 : [[364, 262], [359, 257], [358, 254], [354, 247], [355, 247], [352, 241], [345, 223], [345, 215]],
      // "fairfield-richland"
      105 : [[364, 262], [371, 271], [374, 272], [375, 273], [376, 273], [378, 272], [387, 280], [387, 271], [399, 271], [399, 271], [418, 265], [444, 261]],
      // "kershaw-richland"
      106 : [[481, 293], [475, 293], [467, 300], [462, 297], [459, 296], [456, 292], [454, 291], [439, 278], [439, 272], [444, 261]],
      // "fairfield-kershaw"
      107 : [[444, 261], [447, 255], [449, 250], [451, 245], [454, 240], [453, 236], [451, 229], [447, 231], [444, 229], [440, 227], [439, 224], [438, 220]],
      // "kershaw-lee"
      108 : [[536, 238], [526, 244], [522, 245], [524, 252], [519, 252], [512, 253], [511, 258], [511, 264], [510, 273], [502, 282]],
      // "kershaw-sumter"
      109 : [[502, 282], [495, 286], [493, 288], [489, 291], [487, 292], [484, 293], [483, 292], [481, 292], [481, 293]],
      // "darlington-lee"
      110 : [[574, 295], [566, 290], [559, 286], [559, 282], [559, 278], [562, 276], [564, 274], [565, 271], [565, 268], [564, 266], [562, 256], [559, 256], [556, 250], [554, 247], [554, 242], [554, 239], [548, 242], [547, 250], [539, 243], [537, 242], [537, 241], [536, 238]],
      // "darlington-florence"
      111 : [[639, 248], [640, 246], [637, 255], [628, 253], [625, 263], [613, 260], [576, 293], [574, 295]],
      // "florence-marion"
      112 : [[655, 261], [657, 262], [657, 262], [657, 263], [659, 266], [659, 267], [659, 271], [656, 272], [656, 276], [656, 279], [661, 284], [662, 289], [663, 292], [662, 293], [662, 297], [665, 305], [666, 312], [663, 313], [670, 319], [669, 327], [680, 331], [685, 337], [689, 341], [689, 345], [696, 345], [700, 357]],
      // "florence-williamsburg"
      113 : [[700, 357], [688, 348], [685, 351], [684, 351], [681, 353], [670, 358], [667, 356], [657, 354], [653, 353], [648, 352], [646, 349], [631, 352], [631, 348], [626, 346], [623, 345], [621, 346], [619, 344], [614, 342], [614, 336], [607, 335]],
      // "florence-clarendon"
      114 : [[607, 335], [593, 335], [592, 333], [589, 328], [589, 328], [590, 326], [590, 322]],
      // "florence-sumter"
      115 : [[590, 322], [599, 317], [588, 306]],
      // "florence-lee"
      116 : [[588, 306], [580, 301], [574, 295]],
      // "saluda-newberry"
      117 : [[269, 285], [269, 280], [273, 278], [276, 279], [276, 279], [280, 279], [288, 280], [286, 279], [294, 277], [299, 281], [308, 283], [314, 292], [317, 291], [321, 296], [328, 299], [336, 299]],
      // "saluda-lexington"
      118 : [[336, 299], [319, 340]],
      // "lexington-newberry"
      119 : [[336, 299], [338, 298], [345, 298], [347, 300], [347, 300], [351, 300], [348, 292], [343, 290], [344, 285], [346, 280], [348, 280], [353, 278], [354, 277], [356, 275], [358,274]],
      // "lexington-richland"
      120 : [[358,274], [358, 276], [362, 276], [363, 279], [365, 282], [362, 285], [365, 291], [370, 293], [371, 294], [378, 293], [385, 296], [393, 299], [394, 304], [398, 309], [401, 312], [403, 313], [405, 314], [407, 316], [411, 325], [411, 328], [411, 329], [410, 330], [410, 332], [414, 334], [415, 339]],
      // "lexington-calhoun"
      121 : [[415, 339], [410, 341], [407, 354], [405, 361], [405, 363], [406, 364], [407, 364], [410, 365], [412, 361], [414, 359], [427, 362], [427, 364], [409, 375]],
      // "lexington-orangeburg"
      122 : [[409, 375],[386, 390]],
      // "richland-calhoun"
      123 : [[415, 339], [416, 340], [415, 343], [429, 350], [431, 353], [432, 353], [437, 352], [445, 361], [448, 360], [449, 360], [452, 363], [457, 361], [462, 365], [469, 361], [473, 363], [477, 366]],
      // "richland-sumter"
      124 : [[477, 366],[482, 357], [481, 354], [480, 349], [479, 345], [479, 342], [480, 340], [479, 337], [479, 333], [477, 330], [481, 328], [477, 315], [482, 308], [483, 302], [479, 299], [480, 298], [481, 293]],
      // "orangeburg-dorchester"
      125 : [[524, 463], [516, 462], [507, 464], [503, 456], [502, 455], [501, 450], [501, 448], [466, 470], [449, 480]],
      // "orangeburg-clarendon"
      126 : [[499, 406], [500, 409], [501, 402], [503, 405], [509, 407], [506, 409], [506, 413], [507, 412], [509, 416], [517, 427], [524, 433], [537, 426], [544, 426], [544, 428], [547, 427]],
      // "orangeburg-berkeley"
      127 : [[547, 427], [547, 436], [544, 436], [544, 444], [543, 455], [536, 459], [529, 463], [527, 456], [524, 463]],
      // "orangeburg-bamberg"
      128 : [[449, 480], [444, 475], [441, 468], [425, 454], [407, 444], [401, 440], [396, 437], [385, 432], [378, 428]],
      // "orangeburg-calhoun"
      129 : [[499, 406], [489, 401], [491, 401], [481, 404], [481, 406], [484, 407], [481, 413], [478, 413], [480, 420], [468, 419], [471, 415], [465, 409], [463, 406], [453, 398], [451, 396], [447, 393], [440, 391], [436, 391], [427, 393], [426, 386], [421, 389], [409, 375]],
      // "berkeley-williamsburg"
      130 : [[570, 416], [569, 414], [574, 414], [576, 414], [589, 415], [592, 416], [604, 426], [609, 432], [611, 438], [621, 440], [627, 448], [640, 453]],
      // "berkeley-clarendon"
      131 : [[547, 427], [555, 426], [564, 427], [560, 418], [564, 415], [570, 416]],
      // "berkeley-dorchester"
      132 : [[564, 520], [559, 509], [544, 496], [541, 493], [536, 489], [534, 487], [533, 484], [534, 482], [534, 480], [533, 477], [531, 476], [530, 474], [528, 470], [525, 464], [524, 463]],
      // "calhoun-clarendon"
      133 : [[495, 387], [494, 391], [495, 394], [499, 397], [499, 406]],
      // "calhoun-sumter"
      134 : [[477, 366], [479, 370], [481, 372], [484, 376], [490, 383], [495, 387]],
      // "sumter-clarendon"
      135 : [[590, 322], [537, 356], [517, 360], [518, 371], [512, 372], [513, 367], [508, 367], [508, 372], [503, 371], [501, 374], [499, 384], [495, 387]],
      // "sumter-lee"
      136 : [[502, 282], [504, 289], [500, 290], [511, 295], [522, 300], [531, 292], [534, 307], [540, 308], [540, 310], [541, 316], [552, 314], [553, 324], [569, 315], [578, 311], [584, 305], [588, 306]],
      // "williamsburg-clarendon"
      137 : [[607, 335], [597, 349], [586, 359], [587, 370], [581, 384], [573, 402], [568, 412], [570, 416]]
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

