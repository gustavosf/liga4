Liga4 = {

	turn: 0,
	
	boardSize: [7, 6],
	board: {},
	
	preload: function() {
		var img = ['img/bg-y.png', 'img/bg-r.png'];
		$(img).each(function(){
			$('<img/>')[0].src = this;
		});
	},

	init: function() {
		var self = this;
		self.preload();
		
		$('<div>').addClass('board');
	}
}