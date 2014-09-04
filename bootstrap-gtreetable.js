/* =========================================================
 * bootstrap-gtreetable.js 2.0a
 * http://gtreetable.gilek.net
 * =========================================================
 * Copyright 2014 Maciej "Gilek" Kłak
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */

(function ($) {

    // GTREETABLE CLASS DEFINITION
    // =============================    
    function GTreeTable(element, options) {
        this.options = options;
        this.$tree = $(element);
        this.language = this.options.languages[this.options.language] === undefined ?
                this.options.languages.en :
                this.options.languages[this.options.language];
        this._isNodeDragging = false;
        
        var lang = this.language;

        if (this.options.template === undefined) {
            var template = '<table class="table gtreetable">' +
                '<tr class="' + this.options.classes.node + ' ' + this.options.classes.collapsed + '">' +
                '<td>' +
                '<span>';

            if (this.options.draggable === true) {
                template += '<span class="' + this.options.classes.handleIcon + '">&zwnj;</span>' +
                    '<span class="' + this.options.classes.draggablePointer + '">&zwnj;</span>';
            } 

            template += '<span class="' + this.options.classes.indent + '">&zwnj;</span>' +
                '<span class="' + this.options.classes.ceIcon + ' icon"></span>' +
                '<span class="' + this.options.classes.selectedIcon + ' icon"></span>' +
                '<span class="' + this.options.classes.typeIcon + '"></span>' +                
                '<span class="' + this.options.classes.name + '"></span>' +
                '</span>' +
                '<span class="hide ' + this.options.classes.action + '">' +
                '<input type="text" name="name" value="" style="width: ' + this.options.inputWidth + '" class="form-control" />' +
                '<button type="button" class="btn btn-sm btn-primary ' + this.options.classes.saveButton + '">' + lang.save + '</button> ' +
                '<button type="button" class="btn btn-sm ' + this.options.classes.cancelButton + '">' + lang.cancel + '</button>' +
                '</span>' +
                '<div class="btn-group pull-right">' +
                '<button type="button" class="btn btn-sm btn-default dropdown-toggle node-actions" data-toggle="dropdown">' + lang.action + ' <span class="caret"></span></button>' +
                '<ul class="dropdown-menu" role="menu">' +
                '<li role="presentation" class="dropdown-header">' + lang.action + '</li>';

            this.actions = [];
            if (this.options.defaultActions !== null) {
                this.actions = this.options.defaultActions;
            }

            if (this.options.actions !== undefined) {
                this.actions.push.apply(this.actions, this.options.actions);
            }

            $.each(this.actions, function (index, action) {
                if (action.divider === true) {
                    template += '<li class="divider"></li>';
                } 
                else {
                    var matches = action.name.match(/\{([\w\W]+)\}/),
                        name = matches !== null && matches[1] !== undefined && lang[matches[1]] !== undefined ? lang[matches[1]] : action.name;
                    template += '<li role="presentation"><a href="#notarget" class="node-action-' + index + '" tabindex="-1">' + name + '</a></li>';
                }
            });

            template += '</ul>' +
                    '</div>' +
                    '</td>' +
                    '</tr>' +
                    '</table>';

            this.options.template = template;
        }

        if (this.$tree.find('tbody').length === 0) {
            this.$tree.append('<tbody></tbody>');
        }

        if (!this.options.readonly) {
            this.$tree.addClass('gtreetable-fullAccess');
        }

        this.$nodeTemplate = $(this.options.templateSelector !== undefined ? 
            this.options.templateSelector : 
            this.options.template).find('.' + this.options.classes.node);
          
        if (this.options.draggable === true) {
            this.isNodeDragging(false);
        }
        this.init();
        
    }

    GTreeTable.prototype.VERSION = '2.0a';

    GTreeTable.prototype = {

        getNode: function ($node) {
            return $node.data('bs.gtreetable.gtreetablenode');
        },

        getNodeById: function (id) {
            return this.getNode(this.$tree.find('.' + this.options.classes.node + id));
        },

        getNodePath: function (id) {
            var node = this.getNodeById(id),
                that = this,    
                path = [node.name],
                parent = node.parent;

            node.$node.prevAll('.' + this.options.classes.node).each(function () {
                var currentNode = that.getNode($(this));
                if (currentNode.id === parent) {
                    parent = currentNode.parent;
                    path[path.length] = currentNode.name;
                }
            });
            return path;
        },

        getSelectedNodes: function () {
            var selectedNodes = [],
                that = this;
            $.each(this.$tree.find('.' + this.options.classes.selected), function () {
                selectedNodes.push(that.getNode($(this)));
            });

            return selectedNodes;
        },

        getSourceNodes: function (parentId) {
            var that = this;

            return $.ajax({
                type: 'GET',
                url: that.options.source(parentId),
                dataType: 'json',
                beforeSend: function () {
                    if (parentId > 0) {
                        that.getNodeById(parentId).isLoading(true);
                    }
                },
                success: function (nodes) {
                    for (var x = 0; x < nodes.length; x += 1) {
                        nodes[x].parent = parentId;
                    }

                    if (typeof that.options.sort === "function") {
                        nodes.sort(that.options.sort);
                    }
                },
                error: function (XMLHttpRequest) {
                    alert(XMLHttpRequest.status + ': ' + XMLHttpRequest.responseText);
                },
                complete: function () {
                    if (parentId > 0) {
                        that.getNodeById(parentId).isLoading(false);
                    }
                }
            });
            
        },

        getDescendants: function (oParentNode, options) {
            var that = this,
                settings = $.extend({},{
                    depth: 1,
                    includeNotSaved: false,
                    index: undefined
                },options),
                findPath = '.' + this.options.classes.node,
                depth = settings.depth !== -1 || isNaN(settings.depth) ? settings.depth : Infinity,
                descendants = [];
        
            if ((settings.includeNotSaved === false)) {
                findPath += '.' + this.options.classes.saved;
            }
            
            if (depth > 1) {
                oParentNode.$node.nextAll(findPath).each(function () {
                    var oCurrentNode = that.getNode($(this));
                    if ( (oCurrentNode.level <= oParentNode.level) || (oCurrentNode.level === oParentNode.level && oCurrentNode.parent === oParentNode.parent) ) {
                        if (!(settings.includeNotSaved === true && !oCurrentNode.isSaved())) {
                            return false;
                        }
                    } 
                    descendants.push(oCurrentNode);
                });
            } else {   
                oParentNode.$node
                    .nextAll(findPath + "[data-parent='" + oParentNode.id + "'][data-level='" + (oParentNode.level + 1) + "']")
                    .each(function () {
                        descendants.push(that.getNode($(this)));
                    });
            }
            
            if (!isNaN(settings.index)) {
                var index = settings.index >= 0  ? settings.index - 1 : descendants.length + settings.index;
                return descendants[index];
            }
            return descendants;
        },
        
        getSiblings: function (oNode) {
            var that = this,
                siblings = [],
                findPath = '.' + this.options.classes.node + "[data-parent='" + oNode.parent + "']",
                prev = oNode.$node.prevAll(findPath); 
                
            for (var i = prev.length-1; i >= 0; --i) { 
                siblings.push(that.getNode($(prev[i])));
            }               
                    
            siblings.push(oNode);    
                    
            oNode.$node
                 .nextAll(findPath)
                 .each(function () {
                     siblings.push(that.getNode($(this)));
                 });  
                 
            return siblings;        
        },
        
        init: function () {
            var that = this;

            this.getSourceNodes(0).done(function (data) {
                for(var x in data) {
                    that.insertIntegral(new GTreeTableNode(data[x], that));
                }
            });
        },

        expand: function (oNode, options) {
            var that = this, 
                settings = $.extend({}, {
                onAfterFill: function (oNode, data) {
                    oNode.isExpanded(true);
                    if (data.length === 0) {
                        if (that.options.showExpandIconOnEmpty === true) {
                            oNode.isExpanded(false);
                        } else {
                            oNode.showCeIcon(false);
                        }    
                    }
                }
            },options);
            this.insertChildNodes(oNode, settings);            
        },
        
        collapse: function (oNode) {
            oNode.isExpanded(false);
            
            $.each(this.getDescendants(oNode, { depth: -1, includeNotSaved: true }), function () {
                this.$node.remove();
            });
        },        
        
        insertChildNodes: function (oNode, options) {
            var that = this,
                prevNode = oNode;

            $.when(this.getSourceNodes(oNode.id)).done(function (data) {
                for(var x in data) {
                    var newNode = new GTreeTableNode(data[x], that);
                    that.insertIntegral(newNode, prevNode);
                    prevNode = newNode;
                }

                if (options && typeof options.onAfterFill === 'function') {
                    options.onAfterFill(oNode, data);
                }
            });
        },        

        insertNew: function (oTriggerNode, type, position) {
            var that = this,
                childPosition = (position === 'lastChild' || position === 'firstChild'),
                oNewNode = new GTreeTableNode({
                    level: oTriggerNode.level + (childPosition ? 1 : 0),
                    parent: oTriggerNode.level === 1 && !childPosition ? 0 : (childPosition ? oTriggerNode.id : oTriggerNode.parent),
                    type: type
                },this);
           
            function ins() {
                if (childPosition) {
                    oTriggerNode.isExpanded(true);
                    oTriggerNode.showCeIcon(true);
                }
                that.insert(oNewNode, position, oTriggerNode);   
                oNewNode.insertPosition = position;
                oNewNode.relatedNodeId = oTriggerNode.id;                
                oNewNode.showForm(true);
            }
            
            if ( childPosition && !oTriggerNode.isExpanded() ) {
                this.expand(oTriggerNode,{
                    onAfterFill: function () {
                        ins();
                    }
                });
            } else {
                ins();
            }
        },
        
        insert: function (oNode, position, oRelatedNode) {
            if (position === 'before') {
                oRelatedNode.$node.before(oNode.$node);
            } else if (position === 'after') {
                var oContext = oRelatedNode;
                if (oRelatedNode.isExpanded()) {
                    var oLastChild = this.getDescendants(oRelatedNode,{ depth: 1, index: -1, includeNotSaved: true });
                    oContext = oLastChild === undefined ? oContext : oLastChild;
                }
                oContext.$node.after(oNode.$node);
            } else if (position === 'firstChild') {
                this.getNodeById(oRelatedNode.id).$node.after(oNode.$node);
            } else if (position === 'lastChild') {
                var oLastChild = this.getDescendants(oRelatedNode,{ depth: 1, index: -1, includeNotSaved: true });
                var oContext = oLastChild === undefined ? oRelatedNode : oLastChild;
                oContext.$node.after(oNode.$node);
            } else {
                throw "Wrong position.";
            }
        },    
        
        insertIntegral: function (oNewNode, oNode) {
            if (oNode === undefined) {
                this.$tree.append(oNewNode.$node);
            } else {
                oNode.$node.after(oNewNode.$node);
            }
        },        

        makeEditable: function (oNode) {
            oNode.showForm(true);  
        },

        sortNodeInTree: function(oNode) {
            // sprawdzam czy wezej jest otwearty, jesli tak to pobieram potomkow
            var that = this,
                oSiblings = this.getSiblings(oNode);

            // nie ma rodzenstwa = sortowanie nie jest potrzebne
            if (oSiblings.length > 0) {
                var oDescendants = !oNode.isExpanded() ? [] : this.getDescendants(oNode, { depth: -1, includeNotSaved: true }),
                    oRelated = undefined;
                
                // po kolei sprawdzam pozycje
                $.each(oSiblings, function () {
                    if (that.options.sort(oNode, this) === -1) {
                        oRelated = this;
                        return false;
                    }
                });
                
                // nie bylo sortowania z sukcesem
                if (oRelated === undefined) {
                    oRelated = oSiblings[oSiblings.length-1];
                    if (oRelated.isExpanded()) {
                        oRelated = this.getDescendants(that.getNodeById(oNode.parent), { depth: -1, index: -1, includeNotSaved: true });
                    } 
                    oRelated.$node.after(oNode.$node);
                } else {
                    oRelated.$node.before(oNode.$node);
                }

                oNode.$node.css('border','2px solid blue');

                // przenoszenie potokow
                var prevNode = oNode.$node;
                $.each(oDescendants, function() {
                    var oCurrentNode = this;
                    prevNode.after(oCurrentNode.$node);
                    prevNode = oCurrentNode.$node;
                });                        
            }
        },
        
        save: function (oNode) {
            var that = this;
            if ($.isFunction(that.options.onSave)) {
                $.when(that.options.onSave(oNode)).done(function (data) {
                    oNode.id = data.id;
                    oNode.name = data.name;                                       
                                      
                    if (typeof that.options.sort === "function") {
                        that.sortNodeInTree(oNode);
                    }

                    oNode.render(); 
                    oNode.showForm(false);
                    oNode.isHovered(false);
                });
            }
        },

        saveCancel: function (oNode) {
            oNode.showForm(false);
            if (!oNode.isSaved()) {
                this._remove(oNode);
            } 
        },

        remove: function (oNode) {
            var that = this;
            if (oNode.isSaved()) {
                if ($.isFunction(that.options.onDelete)) {
                    $.when(that.options.onDelete(oNode)).done(function () {
                        that._remove(oNode);
                    });
                }
            } else {
                this._remove(oNode);
            }
        },

        _remove: function (oNode) {            
            if (oNode.isExpanded() === true) {
                this.collapse(oNode); 
            }
            oNode.$node.remove();            
        },
        
        isNodeDragging: function(action) {
            if (action === undefined) {
                return this._isNodeDragging;
            } else if (action === true) {
                this._isNodeDragging = true;
                this.$tree.disableSelection();
            } else {
                this._isNodeDragging = false;
                this.$tree.enableSelection();
            }
        },        
   
        move: function(oSource, oDestination, position) {
            var that = this;
            if ($.isFunction(that.options.onMove)) {
                $.when(that.options.onMove(oSource, oDestination, position)).done(function (data) {
                    oDestination.$node.css('backgroundColor', 'red');
                    oSource.$node.css('backgroundColor', 'green');

                    var oSourceDescendants = that.getDescendants(oSource, { depth: -1, includeNotSaved: true }),
                        oOldSourceParent = that.getNodeById(oSource.parent),
                        delta = oDestination.level - oSource.level;

                    oSource.parent = position === 'lastChild' ? oDestination.id : oDestination.parent;
                    oSource.level = oDestination.level;

                    if (position === 'lastChild' && !oDestination.isExpanded()) {
                        oSource.$node.remove();
                        $.each(oSourceDescendants, function () {
                            this.$node.remove();
                        });                
                    } else {

                        if (position === 'lastChild') {
                            oSource.level += 1;
                            oDestination.showCeIcon(true);
                        }
                        oSource.render();
                        that.insert(oSource, position, oDestination);
                        
                        if (oSourceDescendants.length > 0) {
                            var prevNode = oSource.$node;
                            if (position === 'lastChild') {
                                delta += 1;
                            }
                            $.each(oSourceDescendants, function() {
                                var oNode = this;
                                oNode.level += delta;
                                oNode.render();
                                prevNode.after(oNode.$node);
                                oNode.$node.css('backgroundColor', 'green');
                                prevNode = oNode.$node;
                            });                
                        }                        
                    }

                    // sprawdza, czy nie byl przeniesiony ostatni element
                    // oOldSourceParent !== undefined => parent = 0
                    if (oOldSourceParent !== undefined && that.getDescendants(oOldSourceParent, {depth: 1, includeNotSaved: true }).length === 0) {
                        oOldSourceParent.isExpanded(false);
                    }
                    
                    if (typeof that.options.sort === "function") {
                        that.sortNodeInTree(oSource);
                    }                    
                    
                });
            }
        }
    };

    function GTreeTableNode(data, gtreetable) {
        this.manager = gtreetable;

        this.level = data.level;
        this.parent = data.parent;
        this.name = data.name;
        this.type = data.type;
        this.id = data.id;

        this.insertPosition = undefined;
        this.movePosition = undefined;
        this.relatedNodeId = undefined;
        this._isExpanded = false;
        this._isLoading = false;
        this._isSaved = data.id === undefined ? false : true;
        this._isSelected = false;
        this._isHovered = false;
        this._isEditable = false;

        this.init();
    }

    GTreeTableNode.prototype = {
        
        getMovePosition: function() {
            return this.movePosition;
        },
        
        setMovePosition: function(position) {
            this.$node.removeClass(this.manager.options.classes.draggableBefore + ' ' + this.manager.options.classes.draggableAfter + ' ' + this.manager.options.classes.draggableLastChild);
            if (position !== undefined) {
                this.$node.addClass(this.manager.options.classes.draggable + '-' + position);
                this.movePosition = position;
            }
        },

        getId: function () {
            return this.id;
        },         
        
        getName: function () {
            return this.isEditable() ? this.$input.val() : this.name;
        },
        
        getParent: function () {
            return this.parent;
        },    
        
        getInsertPosition: function () {
            return this.insertPosition;
        },          
        
        getRelatedNodeId: function () {
            return this.relatedNodeId;
        },           
        
        init: function () {
            this.$node = this.manager.$nodeTemplate.clone(false);    
            this.$name = this.$node.find('.' + this.manager.options.classes.name);
            this.$ceIcon = this.$node.find('.' + this.manager.options.classes.ceIcon);
            this.$typeIcon = this.$node.find('.' + this.manager.options.classes.typeIcon);
            this.$icon = this.$node.find('.' + this.manager.options.classes.icon);
            this.$action = this.$node.find('.' + this.manager.options.classes.action);
            this.$indent = this.$node.find('.' + this.manager.options.classes.indent);
            this.$saveButton = this.$node.find('.' + this.manager.options.classes.saveButton);
            this.$cancelButton = this.$node.find('.' + this.manager.options.classes.cancelButton);      
            this.$input = this.$node.find('input');      
            
            this.render();
            this.attachEvents();
            
            this.$node.data('bs.gtreetable.gtreetablenode', this);
        },
        
        render: function() {
            this.$name.html(this.name);
            if (this.id !== undefined) {
                this.$node.data('id', this.id);
                this.$node.addClass(this.manager.options.classes.node + this.id);
                this.$node.addClass(this.manager.options.classes.saved);
                if (this.manager.options.draggable === true) {
                    this.$node.addClass(this.manager.options.classes.draggable);
                }
            }
            this.$node.attr('data-parent', this.parent);
            this.$node.attr('data-level', this.level);

            this.$indent.css('marginLeft', ((parseInt(this.level, 10)-1) * this.manager.options.nodeIndent) + 'px').html('&zwnj;');
            
            if (this.type !== undefined && this.manager.options.types[this.type] !== undefined) {
                this.$typeIcon.addClass(this.manager.options.types[this.type]).show();
            }
        },
        
        attachEvents: function () {
            var that = this;
            
            // hover
            this.$node.mouseover(function () {
                if (!(that.manager.options.draggable === true && that.manager.isNodeDragging() === true)) {
                    that.$node.addClass(that.manager.options.classes.hovered);
                    that.isHovered(true);
                }
            });

            this.$node.mouseleave(function () {
                that.$node.removeClass(that.manager.options.classes.hovered);
                that.isHovered(false);
            });

            this.$name.click(function (e) {
                if (that.isSelected()) {
                    if ($.isFunction(that.manager.options.onUnselect)) {
                        that.manager.options.onUnselect(that);
                    }
                    that.isSelected(false);
                } else {
                    var selectedNodes = that.manager.getSelectedNodes();
                    if (that.manager.options.multiselect === false) {
   
                        if (selectedNodes.length === 1) {
                            selectedNodes[0].isSelected(false);
                        }
                    } else {
                        if (!isNaN(that.manager.options.multiselect) && that.manager.options.multiselect === selectedNodes.length) {
                            if ($.isFunction(that.options.onSelectOverflow)) {
                                that.options.onSelectOverflow(that);
                            }
                            e.preventDefault();
                        }
                    }

                    that.isSelected(true);

                    if ($.isFunction(that.manager.options.onSelect)) {
                        that.manager.options.onSelect(that);
                    }
                }
            });

            this.$ceIcon.click(function (e) {
                if (!that.isExpanded()) {
                    that.manager.expand(that);
                } else {
                    that.manager.collapse(that);
                }
            });
            if (that.manager.options.onDragCanExpand === true) {
                this.$ceIcon.mouseover(function (e) {
                    if (that.manager.options.draggable === true && that.manager.isNodeDragging() === true) {
                        if (!that.isExpanded()) {
                            that.manager.expand(that);
                        }
                    }
                });
            }

            $.each(this.manager.actions, function (index, action) {
                that.$node.find('.' + that.manager.options.classes.action + '-' + index).click(function (event) {
                    action.event(that, that.manager);
                });
            });

            this.$saveButton.click(function () {
                that.manager.save(that);
            });

            this.$cancelButton.click(function () {
                that.manager.saveCancel(that);
            });
            
            if (that.manager.options.draggable === true) {
                function getPosition(ui, $droppable) {
                    var height = $droppable.outerHeight() -(ui.helper.outerHeight() / 2),
                        offset = ui.offset.top - $droppable.offset().top;
                    
                    if (offset  <= (height * 0.3)) {
                        return 'before';
                    } else if (offset  <= (height * 0.7)) {
                        return 'lastChild';
                    } else {
                        return 'after';
                    }                    
                }
             
                this.$node
                    .draggable( {
                        scroll:true,
                        refreshPositions: that.manager.options.onDragCanExpand,
                        helper: function (e) {
                            var oName = that.manager.getNode($(this));
                            return '<mark class="' + that.manager.options.classes.draggableHelper + '">' + oName.name + '</mark>';
                        },
                        cursorAt: {top:0, left: 0 },
                        handle: '.'+ that.manager.options.classes.handleIcon,
                        start: function (e) {
                            $(this).data("bs.gtreetable.gtreetablenode.startingScrollTop",window.pageYOffset);
                            that.manager.isNodeDragging(true);
                        },
                        stop: function (e) {
                            that.manager.isNodeDragging(false);
                        },
                        drag: function (e, ui) {
                            var st = parseInt($(this).data("bs.gtreetable.gtreetablenode.startingScrollTop"));
                            ui.position.top -= st;
                            
                            var $droppable = $(this).data("bs.gtreetable.gtreetablenode.currentDroppable");
                            if ($droppable) {
                                that.manager.getNode($droppable).setMovePosition(getPosition(ui, $droppable));
                            }                            
                        }
                    })
                    .droppable({
                        accept: '.' + that.manager.options.classes.node,
                        over: function(event, ui) {
                            var $this = $(this);
                            that.manager.getNode($this).setMovePosition(getPosition(ui, $this));
                            ui.draggable.data("bs.gtreetable.gtreetablenode.currentDroppable", $this);
                        },
                        out: function(event, ui) {
                            ui.draggable.removeData("bs.gtreetable.gtreetablenode.currentDroppable");
                            that.manager.getNode($(this)).setMovePosition();
                        },
                        drop: function(event, ui) {
                            var $this = $(this),
                                oNode = that.manager.getNode($this),
                                movePosition = oNode.getMovePosition();
                            ui.draggable.removeData("bs.gtreetable.gtreetablenode.currentDroppable");
                            oNode.setMovePosition();
                            that.manager.move(that.manager.getNode(ui.draggable), oNode, movePosition);
                        }
                    });
            }             
        },
        
        isLoading: function (action) {
            if (action === undefined) {
                return this._isLoading;
            } else if (action) {
                this.$name.addClass(this.manager.options.classes.loading);
                this._isLoading = true;
            } else {
                this.$name.removeClass(this.manager.options.classes.loading);
                this._isLoading = false;
            }
        },
        
        isSaved: function (action) {
            if (action === undefined) {
                return this._isSaved;
            } else if (action) {
                this.$name.addClass(this.manager.options.classes.saved);
                this._isSaved = true;
            } else {
                this.$name.removeClass(this.manager.options.classes.saved);
                this._isSaved = false;
            }
        },        
        
        isSelected: function (action) {
            if (action === undefined) {
                return this._isSelected;
            } else if (action) {
                this.$node.addClass(this.manager.options.classes.selected);
                this._isSelected = true;
            } else {
                this.$node.removeClass(this.manager.options.classes.selected);
                this._isSelected = false;
            }            
        },
        
        isExpanded: function (action) {
            if (action === undefined) {
                return this._isExpanded;
            } else if (action) {
                this.$node.addClass(this.manager.options.classes.expanded).removeClass(this.manager.options.classes.collapsed);
                this._isExpanded = true;
            } else {
                this.$node.addClass(this.manager.options.classes.collapsed).removeClass(this.manager.options.classes.expanded);
                this._isExpanded = false;
            }            
        },     
        
        isHovered: function (action) {
            if (action === undefined) {
                return this._isHovered;
            } else if (action) {
                this.$node.addClass(this.manager.options.classes.hovered);
                this._isHovered = true;
            } else {
                this.$node.removeClass(this.manager.options.classes.hovered);
                this.$node.find('.btn-group').removeClass('open');
                this._isHovered = false;
            }            
        },
        
        isEditable: function (action) {
            if (action === undefined) {
                return this._isEditable;
            } else {
                this._isEditable = action;
            }   
        },        
        
        showCeIcon: function (action) {
            this.$ceIcon.css('visibility', action ? 'visible' : 'hidden');
        },
        
        showForm: function (action) {
            if (action === true) {
                this.isEditable(true);
                this.$input.val(this.name);
                this.$name.addClass('hide');
                this.$action.removeClass('hide');
                //TODO nie dziala
                this.$input.focus();
            } else {
                this.isEditable(false);
                this.$name.removeClass('hide');
                this.$action.addClass('hide');
            }
        }
    };

    // OVERLAYINPUT PLUGIN DEFINITION
    // ==============================

    function Plugin(option, _relatedTarget) {
        var retval = null;

        this.each(function () {
            var $this = $(this),
                data = $this.data('bs.gtreetable'),
                options = $.extend({}, $.fn.gtreetable.defaults, $this.data(), typeof option === 'object' && option);

            if (!data) {
                data = new GTreeTable(this, options);
                $this.data('bs.gtreetable', data);
            }

            if (typeof option === 'string') {
                retval = data[option](_relatedTarget);
            }
        });

        if (!retval) {
            retval = this;
        }

        return retval;
    }

    var old = $.fn.gtreetable;

    $.fn.gtreetable = Plugin;
    $.fn.gtreetable.Constructor = GTreeTable;

    $.fn.gtreetable.defaults = {
        nodeIndent: 16,
        language: 'en',
        inputWidth: '60%',
        readonly: false,
        multiselect: false,
        draggable: false,
        onDragCanExpand: false,
        showExpandIconOnEmpty: false,        
        languages: {
            en: {
                save: 'Save',
                cancel: 'Cancel',
                action: 'Action',
                actionAdd: 'Add',
                actionEdit: 'Edit',
                actionDelete: 'Delete',
                deleteConfirm: 'Are you sure?'
            }
        },
        defaultActions: [
            {
                name: 'Add before',
                event: function (oNode, oManager) {
                    oManager.insertNew(oNode, 'default', 'before');
                }
            },
            {
                name: 'Add after',
                event: function (oNode, oManager) {
                    oManager.insertNew(oNode, 'default', 'after');
                }
            },
            {
                name: 'Add first child',
                event: function (oNode, oManager) {
                    oManager.insertNew(oNode, 'default', 'firstChild');
                }
            },
            {
                name: 'Add last child',
                event: function (oNode, oManager) {
                    oManager.insertNew(oNode, 'default', 'lastChild');
                }
            },
            {
                divider: true
            },
            {
                name: '{actionEdit}',
                event: function (oNode, oManager) {
                    oManager.makeEditable(oNode);
                }
            },
            {
                name: '{actionDelete}',
                event: function (oNode, oManager) {
                    if (confirm(oManager.language.deleteConfirm)) {
                        oManager.remove(oNode);
                    }
                }
            }
        ],
        classes: {
            node: 'node',
            loading: 'node-loading',
            selected: 'node-selected',
            hovered: 'node-hovered',
            expanded: 'node-expanded',
            collapsed : 'node-collapsed',
            draggable : 'node-draggable',
            draggableHelper : 'node-draggable-helper',
            draggablePointer : 'node-draggable-pointer',
            draggableBefore : 'node-draggable-before',
            draggableAfter : 'node-draggable-after',
            draggableLastChild : 'node-draggable-lastChild',
            saved: 'node-saved',
            name: 'node-name',
            icon: 'node-icon',            
            selectedIcon: 'node-icon-selected',
            ceIcon: 'node-icon-ce',
            typeIcon: 'node-icon-type',
            handleIcon : 'node-icon-handle',
            action: 'node-action',
            indent: 'node-indent',
            saveButton: 'node-save',
            cancelButton: 'node-cancel'
        }
    };

    // OVERLAYINPUT NO CONFLICT
    // ========================

    $.fn.gtreetable.noConflict = function () {
        $.fn.gtreetable = old;
        return this;
    };

}(jQuery));
