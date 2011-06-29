/** Extensão de um objeto. 
	Usado na passagem de opções na inicialização da interface */
Object.prototype.extend = function (source) {
    var property;
	for (property in source) {
        this[property] = source[property];
	}
    return this;
};

/** Constantes. Id do Player1 e Player2 */
var P1 = 1,
	P2 = 2;

/** Constantes. Humano e computador */	
var HUMAN = 0,
	COMPUTER = 1;
	
/** Classe principal da Interface */
Liga4.Interface = {
	
	turn: P1,
	
	/** Tabuleiro
		O tabuleiro consiste no conjunto de objetos dentro do elemento "div.board"
		Cada elemento "div" dentro deste elemento é uma posição do tabuleiro.
		Portanto teremos 42 elementos dentro da propriedade board. */
	board: {},
	
	/** Transforma o tabuleiro em uma string de 42 (ou col x row) caracteres
		Ex Random: ------------yr----yrr---ryry---ryyy--rryrr-yrryry
		Onde y são peças amarelas, r peças vermelhas e - espaços em branco */
	dumpBoard: function() {
		var b = this.board.children('div');
		b = $.map(b, function(n, i) {
			if (n.className != "") return n.className.substr(0,1);
			return '-';
		});
		return b.join('');
	},
	
	/** Opções iniciais. 
		Estas opções são atualizadas com as opções escolhidas pelo usuário */
	options: {
		rows: 6,
		cols: 7,
		first: P1,
		player1: HUMAN,
		player2: COMPUTER
	},
	
	/** Função para carga das imagens */
	preload: function() {
		var images = ['img/bg-y.png', 'img/bg-r.png'];
		$(images).each(function(){
			$('<img/>')[0].src = this;
		});
	},
	
	/** Função de inicialização da interface */
	init: function(container) {
		this.preload();
		this.container = $(container);
		this.startInterface();
	},
	
	/** Carrega as opções do usuário e inicializa o jogo */
	start: function(opt) {
		this.options.extend(opt);
		this.turn = opt.first;
	},
	
	/** Dispara a interface e os eventos relativos */
	startInterface: function () {
		var self = this,
			i, 
			cases;

		// Limpa o container e instala o tabuleiro nele
		this.container.empty();
		this.board = $('<div>').addClass('board');
		this.board.appendTo(this.container)
		
		// Preenche o tabuleiro com as peças, e instala os
		// eventos para tratamento do click
		cases = this.options.cols * this.options.rows;
		for (i = 1; i <= cases; i++) {
			$('<div>')
				.click(function() {
					// pega a coluna da peça e dispara o método"select"
					var col = $(this).index() % self.options.cols;
					self.select(col, true);
				})
				.appendTo(self.board);
		}	
	},

	/** Função auxiliar para verificar se o usuário está tentando colocar
		uma peça em uma coluna já lotada, ou no caso, fora do tabuleiro */
	inbounds: function(col) {
		var b = this.dumpBoard(),
			line  = '',
			i;
		
		// line irá conter n caracteres, onde n é o número de linhas
		// do tabuleiro. Cada caracter representa a peça em uma linha
		// do tabuleiro, na coluna selecionada
		for (i = 0; i < this.options.rows; i++) {
			line += b.substr(col + this.options.cols * i, 1);
		}
		
		// Caso não haja uma peça vazia, é porque a coluna está lotada
		if (line.indexOf('-') < 0) return false;
		return true;
	},
	
	/** Função para seleção de uma peça
		Verifica se a jogada é possível, pinta a peça respectiva na interface,
		verifica se há um vencedor e comunica o worker caso necessário. */
	select: function(column, human) {
		// ignora caso a jogada não seja possível
		if (!this.inbounds(column)) return;
	
		// caso a jogada tenha sido disparada por um humano, chama
		// o worker caso a próxima jogada seja do computador
		if (human) {
			if ((this.turn == P1 && this.options.player1 === HUMAN) ||
				(this.turn == P2 && this.options.player2 === HUMAN)) {
				Liga4.msg('move', column);
			} else {
				// caso a próxima jogada seja de outro humano, simplesmente
				// para por aqui
				return;
			}
		}
		
		var i,
			b,
			el,
			pos = this.options.rows * this.options.cols - (this.options.cols - column);
		
		// Pinta a peça com a cor respectiva do jogador da rodada, e vira o turno
		for (i = 0; i < this.options.rows; i++) {
			el = this.board.children('div').get(pos);
			if (el.className == "") {
				$(el).addClass(this.turn === P1 ? 'red' : 'yellow');
				this.turn = (this.turn === P1 ? P2 : P1);
				break;
			}
			pos -= this.options.cols;
		}
		
		// verifica se há um vencedor, caso haja declara o mesmo
		b = this.dumpBoard();
		if (this.hasWinner(b, pos)) {
			Liga4.declareWinner(this.turn);
		}
	},
	
	/** Função para verificar se há um vencedor
		Opera sobre uma string de n caracteres (n = row x col), procurando por 
		padrões de vitória */
	hasWinner: function(b, pos) {
		var limit = this.options.rows * this.options.cols - 1,
			row   = Math.floor(pos / this.options.cols),
			col   = pos % this.options.cols,
			turn  = b.substr(pos,1),
			ptrn  = turn + turn + turn + turn,
			line, 
			i;
		
		// verifica 4-in-a-row em uma linha
		// simplesmente extrai da string os 7 caracteres que representam aquela linha
		// e procura pelo padrão 'xxxx' (onde x é r para vermelhas, y para amarelas)
		line  = '';
		line = b.substr(row * this.options.cols, this.options.cols);
		if (line.indexOf(ptrn) > -1) return true;
		
		// verifica 4-in-a-row em uma coluna, usando o mesmo esquema das linhas
		line  = '';
		for (i = col; i <= limit; i += this.options.cols) {
			line += b.substr(i, 1);
		}
		if (line.indexOf(ptrn) > -1) return true;
		
		// verifica 4-in-a-row na diagonal 1, na força bruta ignorante :D
		if ((b[3]+b[9]+b[15]+b[21]).indexOf(ptrn) > -1) return true;
		if ((b[4]+b[10]+b[16]+b[22]+b[28]).indexOf(ptrn) > -1) return true;
		if ((b[5]+b[11]+b[17]+b[23]+b[29]+b[35]).indexOf(ptrn) > -1) return true;
		if ((b[6]+b[12]+b[18]+b[24]+b[30]+b[36]).indexOf(ptrn) > -1) return true;
		if ((b[13]+b[19]+b[25]+b[31]+b[37]).indexOf(ptrn) > -1) return true;
		if ((b[20]+b[26]+b[32]+b[38]).indexOf(ptrn) > -1) return true;
		
		// verifica 4-in-a-row na diagonal 2, na força bruta ignorante :D
		if ((b[3]+b[11]+b[19]+b[27]).indexOf(ptrn) > -1) return true;
		if ((b[2]+b[10]+b[18]+b[26]+b[34]).indexOf(ptrn) > -1) return true;
		if ((b[1]+b[9]+b[17]+b[25]+b[33]+b[41]).indexOf(ptrn) > -1) return true;
		if ((b[0]+b[8]+b[16]+b[24]+b[32]+b[40]).indexOf(ptrn) > -1) return true;
		if ((b[7]+b[15]+b[23]+b[31]+b[39]).indexOf(ptrn) > -1) return true;
		if ((b[14]+b[22]+b[30]+b[38]).indexOf(ptrn) > -1) return true;
		
		return false;
		
		// Por causa da força bruta ignorante, a verificação de vitória na diagonal
		// só funciona para tabuleiros 6x7
	}
}