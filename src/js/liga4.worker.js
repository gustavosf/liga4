wrkr = self;

/** Extendemos um objeto */
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
	
/** Constante. Valor de avaliação no caso de vitória */
var WINVAL = 10000;

/** Classe principal do worker */
var Liga4 = {

	gameActive: false,
	
	/** Opções iniciais. Serão sobrescritas pelas opções selecionadas
		pelo usuário na interface */
	options: {
		rows: 6,
		cols: 7,
		difficulty: 5,
		first: P1,
		player1: HUMAN,
		player2: COMPUTER
	},

	/** Níveis de dificuldade. Muito Fácil a Muito Difícil */
	difficulty: [
		{ levels: 2, wrongProb: 0.9 }, // praticamente random
		{ levels: 2, wrongProb: 0.6 },
		{ levels: 2, wrongProb: 0.2 },
		{ levels: 4, wrongProb: 0.1 },
		{ levels: 4, wrongProb: 0.0 },
		{ levels: 6, wrongProb: 0.0 }
	],
	
	/** Função para inicialização do worker, atualizando as opções do jogo */
	init: function (opt) {
		this.options.extend(opt);
		this.reset();
		this.start();
	},
	
	/** Inicia o jogo. Caso o turno seja do computador, manda ele pensar */
	start: function () {
		this.gameActive = true;
		if (this.options.first === P1 && this.options.player1 === COMPUTER) { this.computersTurn(); }
		if (this.options.first === P2 && this.options.player2 === COMPUTER) { this.computersTurn(); }
	},
	
	/** Função para resetar o jogo. Basicamente inicializa tudo */
	reset: function () {
		this.turn = this.options.first;
		
		// Inicializa o contador de peças em colunas 
		// Isso é usado para facilitar na hora de verificar movimentos válidos
		this.colCount = (function (len) {
			var arr = [];
			while (len--) { arr[len] = 0; }
			return arr;
		}(this.options.cols));
		
		// Inicializa o tabuleiro com zeros
		this.board = (function (cols, rows) {
			var b = [], row, col;
			for (row = 0; row < rows; row += 1) {
				b[row] = [];
				for (col = 0; col < cols; col += 1) {
					b[row][col] = 0;
				}
			}
			return b;
		}(this.options.cols, this.options.rows));
		
		// Inicializa a tabela de jogadas vitoriosas
		// Essa tabela é usada pela função de avaliação para dar uma nota
		// para o tabuleiro. Ela aponta quadras vencedoras para cada uma
		// das peças do tabuleiro
		//
		// Em caso de dúvidas, consultar os slides ou o relatório
		this.linecoords = (function (rows, cols) {
			var row,
				col,
				rowChange,
				colChange,
				coords = [],
				line = 0;
				
			var inbounds = function (r, c) {
				return ((r >= 0) && (c >= 0) && (r < rows) && (c < cols));
			};
			
			for (row = 0; row < rows; row += 1) {
				for (col = 0; col < cols; col += 1) {
					for (rowChange = -1; rowChange <= 1; rowChange += 1) {
						for (colChange = 0; colChange <= 1; colChange += 1) {
							if (inbounds(row + rowChange, col + colChange) &&
							    inbounds(row + (2 * rowChange), col + (2 * colChange)) &&
							    inbounds(row + (3 * rowChange), col + (3 * colChange)) &&
								(((rowChange == 1) && (colChange == 0)) ||
								 ((rowChange == 1) && (colChange == 1)) ||
								 ((rowChange == 0) && (colChange == 1)) ||
								 ((rowChange == -1) && (colChange == 1)))) {
							   
							    coords[line] = [row, col, rowChange, colChange];
								
								if (row == 0 && rowChange == 0 && colChange == 1) {
									coords[line][4] = 2;
								} else {
									coords[line][4] = 1;
								}
		 
								line += 1;
							}
						}
					}
				}
			}
			return coords;
		}(this.options.rows, this.options.cols));
	},
	
	/** Função para troca dos turnos.
		Chama o computador, caso o próximo turno seja dele. Isso permite que
		em uma partida computador x computador, o worker sempre esteja ativo
		sem precisar de interação com a interface */
	switchTurns: function () {
		if (this.gameActive === true) {
			this.turn = (this.turn === P1 ? P2 : P1);
			if ((this.turn === P1 && this.options.player1 === COMPUTER) ||
			    (this.turn === P2 && this.options.player2 === COMPUTER)) { 
				this.computersTurn();
			}
		}
	},
	
	/** Função disparada quando o turno é do computador.
		Nesta função chamamos o minimax e calculamos jogadas 'erradas' para 
		jogos de nível mais fácil */
	computersTurn: function () {
		var player = this.turn,
			d,
			bestMove,
			wrongMove;
		
		// Chama o minimax com o número de níveis especificado pela dificuldade
		d = this.difficulty[this.options.difficulty];
		bestMove = this.maxMove(player, d.levels, true);
		
		// Avaliação simples de uma jogada errada, para jogos mais faceis
		// Sobrescreve a melhor jogada, caso entre neste if
		if (Math.random() < d.wrongProb) {
			// Pega uma coluna
			wrongMove = Math.floor(Math.random() * this.options.cols);
			
			// Caso seja possível jogar naquela coluna
			if (this.colCount[wrongMove] < this.options.rows) {
				bestMove = wrongMove;
			}
		}
		
		// Avisa a Interface da jogada efetuada pelo computador
		this.msg('move', bestMove);
		
		// Joga nessa posição
		this.dropPiece(bestMove);
		
		return bestMove;
	},
	
	/** Função para colocar uma peça em uma coluna do tabuleiro */
	dropPiece: function (whichCol) {
		if (this.gameActive === true && this.colCount[whichCol] < 6) {
			// Incrementa o número de peças na coluna
			this.colCount[whichCol] += 1;
			
			// Coloca a peça naquela coluna
			this.board[this.colCount[whichCol] - 1][whichCol] = this.turn;

			this.switchTurns();
			
			// O worker não verifica se há um vencedor ou não... Isso fica a cargo 
			// da interface. Caso exista um vencedor ela irá matar o worker
		}
	},
	
	/** Função auxiliar para verificar se dá pra colocar uma peça 
		em uma determinada coluna */
	freePlace: function (col) {
		var x = false, 
			row;
			
		for (row = 0; row < this.options.rows; row += 1) {
			if (this.board[row][col] === 0) { // found where to put the Piece
				x = row;
				break;
			}
		}
		
		// Retorna o número da coluna ou false para nenhuma posição
		return x;
	},
	
	/** Implementação do movimento "MAX"
		Recebe como parâmetros o jogador que está efetuando a jogada, o nível que 
		o minimax deve chegar, o máximo do pai na árvore e "val", que indica se
		o minimax deve retornar o valor, ou a coluna calculada */
	maxMove: function (player, level, val) {
		// Caso o nível seja 0, chegamos no fim do cálculo da árvore e 
		// retornaremos o valor do tabuleiro
		if (level <= 0) {  
			return this.getBoardValue(player);
		} else {
			// Caso contrário, entramos na recursão para calcular o melhor filho
			var maxCol = 0,
				maxValue = -WINVAL * 10,
				col, 
				row, 
				thisValue;
			
			// Para todas as possíveis jogadas, ele tenta o mini
			for (col = 0; col < this.options.cols; col += 1) {
				row = this.freePlace(col);
				
				if (row !== false) {
				
					// Faz a busca na árvore, chamando min para a jogada do oponente
					this.board[row][col] = player;
					thisValue = this.minMove(player, level - 1);
					this.board[row][col] = 0; // undo move
					
					// Caso seja uma jogada vencedora para o max, retorna essa jogada
					if (thisValue === WINVAL) {
						return col; 
					} else if (thisValue > maxValue) {
						// Caso seja uma boa jogada, atualiza e 
						// continua buscando na árvore
						maxValue = thisValue;
						maxCol = col;
					}
				}
			}

			// Verifica se deve retornar a coluna a ser jogada, ou o valor da jogada max
			if (val === true) {
				return maxCol;
			} else {
				return maxValue;
			}
		}
	},
 
	/** Movimento de minimização da jogada (para o oponente)
		Funciona exatamente da mesma maneira que o max, mas com valores 
		de avaliação opostos */
	minMove: function (player, level) {
		if (level <= 0) {
			return this.getBoardValue(player);
		} else {
			var minCol = 0,
				minValue = WINVAL * 10,
				col, 
				row, 
				thisValue;
			
			for (col = 0; col < this.options.cols; col += 1) {
				row = this.freePlace(col);
			
				if (row !== false) {
					// Aqui verifica qual player é, para jogar com o player oposto
					if (player === P1) {
						this.board[row][col] = P2;
					} else {
						this.board[row][col] = P1;
					}
					thisValue = this.maxMove(player, level - 1);
					this.board[row][col] = 0;
					
					if (thisValue === -WINVAL) {
						return -WINVAL;
					} else if (thisValue < minValue) {
						minValue = thisValue;
						minCol = col;
					}
				}
			}
			return minValue;
		}
	},
	
	/** Funçao de avaliação do tabuleiro.
		Basicamente varre todas as possíveis jogadas vitoriosas do tabuleiro, 
		somando a força dessas jogadas. O valor final será o valor do tabuleiro
		para aquele estado */
	getBoardValue: function (player) {
		var sum = 0, 
			line, 
			row;
			
		// Em caso de´dúvidas de como o linecoords é criado, veja os slides
		// Soma as forças de cada jogada vitoriosa
		for (row = 0; row < this.linecoords.length; row += 1) {
			line = this.linecoords[row];
			sum += this.strength(player, line[0], line[1], line[2], line[3]) * line[4];
		}
		return sum;
	},
	
	/** Função que irá calcular a força de uma jogada vitoriosa */
	strength: function (player, row, col, rowChange, colChange) {
		var playerPiecesInRow = 0,
			maxPlayerPiecesInRow = 0,
			advPiecesInRow = 0,
			maxAdvPiecesInRow = 0,
			str,
			player2, 
			pos, 
			posPlayer;
		
		player2 = (player === P2 ? P1 : P2);
		
		// Para cada uma das 4 posições avaliadas, começando a posição da peça
		for (pos = 0; pos < 4; pos += 1) {
			
			// Calcula a peça naquela posição, levando em conta o deslocamento
			// que é dado por rowChange e colChange.
			// Isso permite que verifiquemos tanto 4 em linha como 4 em coluna e
			// em diagonais
			posPlayer = this.board[row + pos * rowChange][col + pos * colChange];
			
			// Calcula peças ligadas do jogador, e do adversário 
			if (posPlayer === player) {
				playerPiecesInRow += 1;
				if (playerPiecesInRow > maxPlayerPiecesInRow) { 
					maxPlayerPiecesInRow = playerPiecesInRow;
				}
			} else {
				playerPiecesInRow = 0;
			} 
			
			if (posPlayer === player2) {
				advPiecesInRow += 1;
				if (advPiecesInRow > maxAdvPiecesInRow) { 
					maxAdvPiecesInRow = advPiecesInRow;
				}
			} else {
				advPiecesInRow = 0;
			} 
		}
		
		// Retorna um valor numérico que representa o que achamos que valha
		// Um determinado número de peças em sequência
		str = 0;
		if (maxPlayerPiecesInRow === 1) { str += 1; }
		if (maxPlayerPiecesInRow === 2) { str += 10; }
		if (maxPlayerPiecesInRow === 3) { str += 100 - maxAdvPiecesInRow * 25; }
		if (maxPlayerPiecesInRow === 4) { str = WINVAL; }
		if (maxAdvPiecesInRow === 1) { str -= 1; }
		if (maxAdvPiecesInRow === 2) { str -= 10; }
		if (maxAdvPiecesInRow === 3) { str -= 100 - maxPlayerPiecesInRow * 25; }
		if (maxAdvPiecesInRow === 4) { str = -WINVAL; }

		// Note que peças em sequencia do adversario diminuem a importancia de peças
		// na sequencia do jogador. Bem como uma trinca bloqueada ter um valor menor
		// que uma trinca com um espaço em branco, uma possível jogada vitoriosa.
		return str;
	},
	
	/** Funçao para comunicação com a interface */
	msg: function (msg, data) {
		wrkr.postMessage({
			m: msg,
			d: data
		});
	}
	
};

/** Evento que trata o recebimento de mensagens da interface, 
	verificando qual o comando e executando a operação respectiva
	no worker */
wrkr.onmessage = function (e) {
	// e.data.m contém a mensagem enviada
	// e.data.d contém os dados enviados
    switch (e.data.m) {
		case 'start': 
			Liga4.init(e.data.d);
			break;
		case 'move':
			Liga4.dropPiece(e.data.d);
			break;
		default:
			Liga4.msg('error');
	}
};