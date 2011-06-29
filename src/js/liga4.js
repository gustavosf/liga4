/** Classe mãe do jogo.
	Contém as sub-classes Interface e Worker, além de métodos básicos
	para a gerência dos dois */
Liga4 = {

	/** Inicialização. Basicamente inicia a interface do jogo */
	init: function(element) {
		this.Interface.init(element);
	},
	
	/** Função para troca de mensagens entre o worker e a interface.
		A interface irá chamar Liga4.msg cada vez que quiser enviar uma mensagem
		para o worker. A resposta do worker é tratada no método "startWorker" */
	msg: function(msg, data) {
		if (this.Worker === undefined) return;
		this.Worker.postMessage({
			m: msg,
			d: data
		});
	},
	
	/** Inicializa o jogo. Este método é chamado pela interface depois do usuário
		selecionar as opções do jogo */
	start: function(el) {
		// puxa as informações do formulário
		var o = $('select option:selected'),
			opt = {};
		o.each(function (i, el) {
			opt[$(el).parent().attr('name')] = parseInt($(el).val(), 10);
		});
		
		// inicializa a interface com as opções do usuário
		this.Interface.start(opt);
		
		// caso pelo menos um dos dois jogadores seja o computador, inicializa o worker
		if (opt.player1 || opt.player2) {
			this.startWorker();
			this.msg('start', opt);
		} else {
			this.Worker = undefined;
		}
		
		// remove a cortina da frente do tabuleiro :)
		$('.shadow').fadeOut();
	},
	
	/** Função para inicializar o Worker */
	startWorker: function() {
		// Cria um worker, que está descrito no arquivo js.liga4.worker.js
		this.Worker = new Worker('js/liga4.worker.js');
		
		// Quando o worker responder com mensagens, elas serão tratadas aqui
		this.Worker.onmessage = function(e){
			console.log(e.data.m, e.data.d);
			switch (e.data.m) {
				// a única resposta do worker é 'move', que indica um movimento
				// do computador. Aqui apenas informamos a interface que o computador fez 
				// um movimento (note que o segundo parâmetro do select é "undefined"
				case 'move':
					Liga4.Interface.select(e.data.d);
					break;
				default:
					break;
			}
		};
	},
	
	/** Função para declarar um vencedor. 
		É chamada pela interface quando ela capta uma jogada vitoriosa.
		Caso exista um worker ligado, ele mata o worker */
	declareWinner: function(player) {
		// Preenche a mensagem de vitória, e mostra na tela
		$('.shadow div#rules').hide();
		var h1 = $('<h1>'+(player === P1 ? 'Amarelas' : 'Vermelhas')+'</h1>')
					.css('color', player === P1 ? 'yellow' : 'red');
		$('.shadow div#result')
			.append(h1)
			.append('Venceram!')
			.click(function () {
				window.location.reload();
			})
			.show();
		$('.shadow').show();
		
		// mata o worker, caso ele exista
		if (this.Worker !== undefined) {
			this.Worker.terminate();
		}
	}
};