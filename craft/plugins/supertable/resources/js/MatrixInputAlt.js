(function($){

//
// Due to how we're handling Matrix-SuperTable-Matrix, we need to load up a slightly modified MatrixInput.js
// see getParsedBlockHtml()
//

Craft.MatrixInputAlt = Garnish.Base.extend(
{
	id: null,
	blockTypes: null,
	blockTypesByHandle: null,
	inputNamePrefix: null,
	inputIdPrefix: null,
	maxBlocks: null,

	showingAddBlockMenu: false,
	addBlockBtnGroupWidth: null,
	addBlockBtnContainerWidth: null,

	$container: null,
	$blockContainer: null,
	$addBlockBtnContainer: null,
	$addBlockBtnGroup: null,
	$addBlockBtnGroupBtns: null,

	blockSort: null,
	blockSelect: null,
	totalNewBlocks: 0,

	init: function(id, blockTypes, inputNamePrefix, maxBlocks)
	{
		this.id = id
		this.blockTypes = blockTypes;
		this.inputNamePrefix = inputNamePrefix;
		this.inputIdPrefix = Craft.formatInputId(this.inputNamePrefix);
		this.maxBlocks = maxBlocks;

		this.$container = $('#'+this.id);
		this.$blockContainer = this.$container.children('.blocks');
		this.$addBlockBtnContainer = this.$container.children('.buttons');
		this.$addBlockBtnGroup = this.$addBlockBtnContainer.children('.btngroup');
		this.$addBlockBtnGroupBtns = this.$addBlockBtnGroup.children('.btn');
		this.$addBlockMenuBtn = this.$addBlockBtnContainer.children('.menubtn');

		this.setNewBlockBtn();

		this.blockTypesByHandle = {};

		for (var i = 0; i < this.blockTypes.length; i++)
		{
			var blockType = this.blockTypes[i];
			this.blockTypesByHandle[blockType.handle] = blockType;
		}

		var $blocks = this.$blockContainer.children(),
			collapsedBlocks = Craft.MatrixInputAlt.getCollapsedBlockIds();

		this.blockSort = new Garnish.DragSort($blocks, {
			handle: '> .actions > .move',
			axis: 'y',
			filter: $.proxy(function()
			{
				// Only return all the selected items if the target item is selected
				if (this.blockSort.$targetItem.hasClass('sel'))
				{
					return this.blockSelect.getSelectedItems();
				}
				else
				{
					return this.blockSort.$targetItem;
				}
			}, this),
			collapseDraggees: true,
			magnetStrength: 4,
			helperLagBase: 1.5,
			helperOpacity: 0.9,
			onSortChange: $.proxy(function() {
				this.blockSelect.resetItemOrder();
			}, this)
		});

		this.blockSelect = new Garnish.Select(this.$blockContainer, $blocks, {
			multi: true,
			vertical: true,
			handle: '> .checkbox, > .titlebar',
			checkboxMode: true
		});

		for (var i = 0; i < $blocks.length; i++)
		{
			var $block = $($blocks[i]),
				id = $block.data('id');

			// Is this a new block?
			var newMatch = (typeof id == 'string' && id.match(/new(\d+)/));

			if (newMatch && newMatch[1] > this.totalNewBlocks)
			{
				this.totalNewBlocks = parseInt(newMatch[1]);
			}

			var block = new MatrixBlock(this, $block);

			if (block.id && $.inArray(''+block.id, collapsedBlocks) != -1)
			{
				block.collapse();
			}
		}

		this.addListener(this.$addBlockBtnGroupBtns, 'click', function(ev)
		{
			var type = $(ev.target).data('type');
			this.addBlock(type);
		});

		new Garnish.MenuBtn(this.$addBlockMenuBtn,
		{
			onOptionSelect: $.proxy(function(option)
			{
				var type = $(option).data('type');
				this.addBlock(type);
			}, this)
		});

		this.updateAddBlockBtn();

		this.addListener(this.$container, 'resize', 'setNewBlockBtn');
	},

	setNewBlockBtn: function()
	{
		// Do we know what the button group width is yet?
		if (!this.addBlockBtnGroupWidth)
		{
			this.addBlockBtnGroupWidth = this.$addBlockBtnGroup.width();

			if (!this.addBlockBtnGroupWidth)
			{
				return;
			}
		}

		// Only check if the container width has resized
		if (this.addBlockBtnContainerWidth !== (this.addBlockBtnContainerWidth = this.$addBlockBtnContainer.width()))
		{
			if (this.addBlockBtnGroupWidth > this.addBlockBtnContainerWidth)
			{
				if (!this.showingAddBlockMenu)
				{
					this.$addBlockBtnGroup.addClass('hidden');
					this.$addBlockMenuBtn.removeClass('hidden');
					this.showingAddBlockMenu = true;
				}
			}
			else
			{
				if (this.showingAddBlockMenu)
				{
					this.$addBlockMenuBtn.addClass('hidden');
					this.$addBlockBtnGroup.removeClass('hidden');
					this.showingAddBlockMenu = false;

					// Because Safari is awesome
					if (navigator.userAgent.indexOf('Safari') !== -1)
					{
						Garnish.requestAnimationFrame($.proxy(function() {
							this.$addBlockBtnGroup.css('opacity', 0.99);

							Garnish.requestAnimationFrame($.proxy(function() {
								this.$addBlockBtnGroup.css('opacity', '');
							}, this));
						}, this));
					}
				}
			}
		}

	},

	canAddMoreBlocks: function()
	{
		return (!this.maxBlocks || this.$blockContainer.children().length < this.maxBlocks);
	},

	updateAddBlockBtn: function()
	{
		if (this.canAddMoreBlocks())
		{
			this.$addBlockBtnGroup.removeClass('disabled');
			this.$addBlockMenuBtn.removeClass('disabled');
		}
		else
		{
			this.$addBlockBtnGroup.addClass('disabled');
			this.$addBlockMenuBtn.addClass('disabled');
		}
	},

	addBlock: function(type, $insertBefore)
	{
		if (!this.canAddMoreBlocks())
		{
			return;
		}

		this.totalNewBlocks++;

		var id = 'new'+this.totalNewBlocks;

		var html =
			'<div class="matrixblock" data-id="'+id+'">' +
				'<input type="hidden" name="'+this.inputNamePrefix+'['+id+'][type]" value="'+type+'"/>' +
				'<input type="hidden" name="'+this.inputNamePrefix+'['+id+'][enabled]" value="1"/>' +
				'<div class="titlebar">' +
					'<div class="blocktype">'+this.getBlockTypeByHandle(type).name+'</div>' +
					'<div class="preview"></div>' +
				'</div>' +
				'<div class="checkbox" title="'+Craft.t('Select')+'"></div>' +
				'<div class="actions">' +
					'<div class="status off" title="'+Craft.t('Disabled')+'"></div>' +
					'<a class="settings icon menubtn" title="'+Craft.t('Actions')+'" role="button"></a> ' +
					'<div class="menu">' +
						'<ul class="padded">' +
							'<li><a data-icon="collapse" data-action="collapse">'+Craft.t('Collapse')+'</a></li>' +
							'<li class="hidden"><a data-icon="expand" data-action="expand">'+Craft.t('Expand')+'</a></li>' +
							'<li><a data-icon="disabled" data-action="disable">'+Craft.t('Disable')+'</a></li>' +
							'<li class="hidden"><a data-icon="enabled" data-action="enable">'+Craft.t('Enable')+'</a></li>' +
						'</ul>' +
						'<hr class="padded"/>' +
						'<ul class="padded">';

		for (var i = 0; i < this.blockTypes.length; i++)
		{
			var blockType = this.blockTypes[i];
			html += '<li><a data-icon="+" data-action="add" data-type="'+blockType.handle+'">'+Craft.t('Add {type} above', { type: blockType.name })+'</a></li>';
		}

		html +=
						'</ul>' +
						'<hr class="padded"/>' +
						'<ul class="padded">' +
							'<li><a data-icon="remove" data-action="delete">'+Craft.t('Delete')+'</a></li>' +
						'</ul>' +
					'</div>' +
					'<a class="move icon" title="'+Craft.t('Reorder')+'" role="button"></a> ' +
				'</div>' +
			'</div>';

		var $block = $(html);

		if ($insertBefore)
		{
			$block.insertBefore($insertBefore);
		}
		else
		{
			$block.appendTo(this.$blockContainer);
		}

		var $fieldsContainer = $('<div class="fields"/>').appendTo($block),
			bodyHtml = this.getParsedBlockHtml(this.blockTypesByHandle[type].bodyHtml, id),
			footHtml = this.getParsedBlockHtml(this.blockTypesByHandle[type].footHtml, id);

		$(bodyHtml).appendTo($fieldsContainer);

		// Animate the block into position
		$block.css(this.getHiddenBlockCss($block)).velocity({
			opacity: 1,
			'margin-bottom': 10
		}, 'fast', $.proxy(function()
		{
			$block.css('margin-bottom', '');
			Garnish.$bod.append(footHtml);
			Craft.initUiElements($fieldsContainer);
			new MatrixBlock(this, $block);
			this.blockSort.addItems($block);
			this.blockSelect.addItems($block);
			this.updateAddBlockBtn();

			Garnish.requestAnimationFrame(function()
			{
				// Scroll to the block
				Garnish.scrollContainerToElement($block);
			});
		}, this));
	},

	getBlockTypeByHandle: function(handle)
	{
		for (var i = 0; i < this.blockTypes.length; i++)
		{
			if (this.blockTypes[i].handle == handle)
			{
				return this.blockTypes[i];
			}
		}
	},

	collapseSelectedBlocks: function()
	{
		this.callOnSelectedBlocks('collapse');
	},

	expandSelectedBlocks: function()
	{
		this.callOnSelectedBlocks('expand');
	},

	disableSelectedBlocks: function()
	{
		this.callOnSelectedBlocks('disable');
	},

	enableSelectedBlocks: function()
	{
		this.callOnSelectedBlocks('enable');
	},

	deleteSelectedBlocks: function()
	{
		this.callOnSelectedBlocks('selfDestruct');
	},

	callOnSelectedBlocks: function(fn)
	{
		for (var i = 0; i < this.blockSelect.$selectedItems.length; i++)
		{
			this.blockSelect.$selectedItems.eq(i).data('block')[fn]();
		}
	},

	getHiddenBlockCss: function($block)
	{
		return {
			opacity: 0,
			marginBottom: -($block.outerHeight())
		};
	},

	getParsedBlockHtml: function(html, id)
	{
		if (typeof html == 'string')
		{
			// CRAWF
			return html.replace(/__BLOCK2__/g, id);
		}
		else
		{
			return '';
		}
	}
},
{
	collapsedBlockStorageKey: 'Craft-'+Craft.siteUid+'.MatrixInputAlt.collapsedBlocks',

	getCollapsedBlockIds: function()
	{
		if (typeof localStorage[Craft.MatrixInputAlt.collapsedBlockStorageKey] == 'string')
		{
			return Craft.filterArray(localStorage[Craft.MatrixInputAlt.collapsedBlockStorageKey].split(','));
		}
		else
		{
			return [];
		}
	},

	setCollapsedBlockIds: function(ids)
	{
		localStorage[Craft.MatrixInputAlt.collapsedBlockStorageKey] = ids.join(',');
	},

	rememberCollapsedBlockId: function(id)
	{
		if (typeof Storage !== 'undefined')
		{
			var collapsedBlocks = Craft.MatrixInputAlt.getCollapsedBlockIds();

			if ($.inArray(''+id, collapsedBlocks) == -1)
			{
				collapsedBlocks.push(id);
				Craft.MatrixInputAlt.setCollapsedBlockIds(collapsedBlocks);
			}
		}
	},

	forgetCollapsedBlockId: function(id)
	{
		if (typeof Storage !== 'undefined')
		{
			var collapsedBlocks = Craft.MatrixInputAlt.getCollapsedBlockIds(),
				collapsedBlocksIndex = $.inArray(''+id, collapsedBlocks);

			if (collapsedBlocksIndex != -1)
			{
				collapsedBlocks.splice(collapsedBlocksIndex, 1);
				Craft.MatrixInputAlt.setCollapsedBlockIds(collapsedBlocks);
			}
		}
	}
});


var MatrixBlock = Garnish.Base.extend(
{
	matrix: null,
	$container: null,
	$titlebar: null,
	$fieldsContainer: null,
	$previewContainer: null,
	$actionMenu: null,
	$collapsedInput: null,

	isNew: null,
	id: null,

	collapsed: false,

	init: function(matrix, $container)
	{
		this.matrix = matrix;
		this.$container = $container;
		this.$titlebar = $container.children('.titlebar');
		this.$previewContainer = this.$titlebar.children('.preview');
		this.$fieldsContainer = $container.children('.fields');

		this.$container.data('block', this);

		this.id    = this.$container.data('id');
		this.isNew = (!this.id || (typeof this.id == 'string' && this.id.substr(0, 3) == 'new'));

		var $menuBtn = this.$container.find('> .actions > .settings'),
			menuBtn = new Garnish.MenuBtn($menuBtn);

		this.$actionMenu = menuBtn.menu.$container;

		menuBtn.menu.settings.onOptionSelect = $.proxy(this, 'onMenuOptionSelect');

		// Was this block already collapsed?
		if (Garnish.hasAttr(this.$container, 'data-collapsed'))
		{
			this.collapse();
		}

		this.addListener(this.$titlebar, 'dblclick', function(ev)
		{
			ev.preventDefault();
			this.toggle();
		});
	},

	toggle: function()
	{
		if (this.collapsed)
		{
			this.expand();
		}
		else
		{
			this.collapse(true);
		}
	},

	collapse: function(animate)
	{
		if (this.collapsed)
		{
			return;
		}

		this.$container.addClass('collapsed');

		var previewHtml = '',
			$fields = this.$fieldsContainer.children();

		for (var i = 0; i < $fields.length; i++)
		{
			var $field = $($fields[i]),
				$inputs = $field.children('.input').find('select,input[type!="hidden"],textarea,.label'),
				inputPreviewText = '';

			for (var j = 0; j < $inputs.length; j++)
			{
				var $input = $($inputs[j]);

				if ($input.hasClass('label'))
				{
					var $maybeLightswitchContainer = $input.parent().parent();

					if ($maybeLightswitchContainer.hasClass('lightswitch') && (
						($maybeLightswitchContainer.hasClass('on') && $input.hasClass('off')) ||
						(!$maybeLightswitchContainer.hasClass('on') && $input.hasClass('on'))
					))
					{
						continue;
					}

					var value = $input.text();
				}
				else
				{
					var value = Craft.getText(Garnish.getInputPostVal($input));
				}

				if (value instanceof Array)
				{
					value = value.join(', ');
				}

				if (value)
				{
					value = Craft.trim(value);

					if (value)
					{
						if (inputPreviewText)
						{
							inputPreviewText += ', ';
						}

						inputPreviewText += value;
					}
				}
			}

			if (inputPreviewText)
			{
				previewHtml += (previewHtml ? ' <span>|</span> ' : '') + inputPreviewText;
			}
		}

		this.$previewContainer.html(previewHtml);

		this.$fieldsContainer.velocity('stop');
		this.$container.velocity('stop');

		if (animate)
		{
			this.$fieldsContainer.velocity('fadeOut', { duration: 'fast' });
			this.$container.velocity({ height: 17 }, 'fast');
		}
		else
		{
			this.$previewContainer.show();
			this.$fieldsContainer.hide();
			this.$container.css({ height: 17 });
		}

		setTimeout($.proxy(function() {
			this.$actionMenu.find('a[data-action=collapse]:first').parent().addClass('hidden');
			this.$actionMenu.find('a[data-action=expand]:first').parent().removeClass('hidden');
		}, this), 200);

		// Remember that?
		if (!this.isNew)
		{
			Craft.MatrixInputAlt.rememberCollapsedBlockId(this.id);
		}
		else
		{
			if (!this.$collapsedInput)
			{
				this.$collapsedInput = $('<input type="hidden" name="'+this.matrix.inputNamePrefix+'['+this.id+'][collapsed]" value="1"/>').appendTo(this.$container);
			}
			else
			{
				this.$collapsedInput.val('1');
			}
		}

		this.collapsed = true;
	},

	expand: function()
	{
		if (!this.collapsed)
		{
			return;
		}

		this.$container.removeClass('collapsed');

		this.$fieldsContainer.velocity('stop');
		this.$container.velocity('stop');

		var collapsedContainerHeight = this.$container.height();
		this.$container.height('auto');
		this.$fieldsContainer.show();
		var expandedContainerHeight = this.$container.height();
		this.$container.height(collapsedContainerHeight);
		this.$fieldsContainer.hide().velocity('fadeIn', { duration: 'fast' });
		this.$container.velocity({ height: expandedContainerHeight }, 'fast', $.proxy(function() {
			this.$previewContainer.html('');
			this.$container.height('auto');
		}, this));

		setTimeout($.proxy(function() {
			this.$actionMenu.find('a[data-action=collapse]:first').parent().removeClass('hidden');
			this.$actionMenu.find('a[data-action=expand]:first').parent().addClass('hidden');
		}, this), 200);

		// Remember that?
		if (!this.isNew && typeof Storage !== 'undefined')
		{
			var collapsedBlocks = Craft.MatrixInputAlt.getCollapsedBlockIds(),
				collapsedBlocksIndex = $.inArray(''+this.id, collapsedBlocks);

			if (collapsedBlocksIndex != -1)
			{
				collapsedBlocks.splice(collapsedBlocksIndex, 1);
				Craft.MatrixInputAlt.setCollapsedBlockIds(collapsedBlocks);
			}
		}

		if (!this.isNew)
		{
			Craft.MatrixInputAlt.forgetCollapsedBlockId(this.id);
		}
		else if (this.$collapsedInput)
		{
			this.$collapsedInput.val('');
		}

		this.collapsed = false;
	},

	disable: function()
	{
		this.$container.children('input[name$="[enabled]"]:first').val('');
		this.$container.addClass('disabled');

		setTimeout($.proxy(function() {
			this.$actionMenu.find('a[data-action=disable]:first').parent().addClass('hidden');
			this.$actionMenu.find('a[data-action=enable]:first').parent().removeClass('hidden');
		}, this), 200);

		this.collapse(true);
	},

	enable: function()
	{
		this.$container.children('input[name$="[enabled]"]:first').val('1');
		this.$container.removeClass('disabled');

		setTimeout($.proxy(function() {
			this.$actionMenu.find('a[data-action=disable]:first').parent().removeClass('hidden');
			this.$actionMenu.find('a[data-action=enable]:first').parent().addClass('hidden');
		}, this), 200);
	},

	onMenuOptionSelect: function(option)
	{
		var batchAction = (this.matrix.blockSelect.totalSelected > 1 && this.matrix.blockSelect.isSelected(this.$container)),
			$option = $(option);

		switch ($option.data('action'))
		{
			case 'collapse':
			{
				if (batchAction)
				{
					this.matrix.collapseSelectedBlocks();
				}
				else
				{
					this.collapse(true);
				}

				break;
			}

			case 'expand':
			{
				if (batchAction)
				{
					this.matrix.expandSelectedBlocks();
				}
				else
				{
					this.expand();
				}

				break;
			}

			case 'disable':
			{
				if (batchAction)
				{
					this.matrix.disableSelectedBlocks();
				}
				else
				{
					this.disable();
				}

				break;
			}

			case 'enable':
			{
				if (batchAction)
				{
					this.matrix.enableSelectedBlocks();
				}
				else
				{
					this.enable();
					this.expand();
				}

				break;
			}

			case 'add':
			{
				var type = $option.data('type');
				this.matrix.addBlock(type, this.$container);
				break;
			}

			case 'delete':
			{
				if (batchAction)
				{
					if (confirm(Craft.t('Are you sure you want to delete the selected blocks?')))
					{
						this.matrix.deleteSelectedBlocks();
					}
				}
				else
				{
					this.selfDestruct();
				}

				break;
			}
		}
	},

	selfDestruct: function()
	{
		this.$container.velocity(this.matrix.getHiddenBlockCss(this.$container), 'fast', $.proxy(function()
		{
			this.$container.remove();
			this.matrix.updateAddBlockBtn();
		}, this));
	}
});


})(jQuery);
