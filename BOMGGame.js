/*	
	Alumno: Alejandro González Santiago
	DNI: 05446435-N
	Proyecto final: Battle of Mayan´s gods
	Asignatura: Desarrollo de videojuegos mediante tecnologías web
*/




window.addEventListener("load",function() {

//----------------------------------MOTOR DEL JUEGO-----------------------------------------------------------\\
	//Definición del motor de juego, incluyendo los módulos necesarios, el canvas definido en el html
	//y los controles por defecto del motor
	var Q = Quintus({audioSupported: [ 'mp3','ogg']}).include("Sprites, Scenes, Input, UI, Touch, TMX, Anim, 2D, Audio")
								.setup("game").controls().touch().enableSound();
								
   //Quitamos la gravedad del juego para que los objetos no tengan gravedad
	Q.gravityY = 0;
	Q.gravityX = 0;
	
	//VARIABLES GLOBALES DEL JUEGO
	var actualPlayerLevel="initialHouseLevel";
	var canThrowBomb=false;
	var hasTalkedMom=false;
	var hasTalkedTraveler=false;
	var totalBossLive=1000;
	
	//DIALOGOS
	
	//diálogo del intro del juego
	var introDialogue=[
						"En el pueblo de Otulum, sus \nciudadanos disfrutaban de \ntiempos de paz",
						"Hasta que un buen d"+'\u00ed'+"a \nempezaron a salir criaturas \ndel templo del sol",
						"Yumil, el monje del pueblo, \nacude a Xin para que los libere \nde los demonios de Xibalb" +'\u00e1'					   
					   ]
					   
	//diálogo del monje
	var monkDialogue=[
						"Xin, tienes que ayudarnos. \nHay demonios saliendo del \ntemplo.",
						"Xibalb" +'\u00e1' + " ha capturado a los \nBacab y est"+'\u00e1' + " sembrando \nel terror en el pueblo.",
						"Debes ir al templo y derrotarle \npara rescatar a las Bacab y \nrestaurar la paz"					   
					   ]
					   
	//diálogo jefe al principio
	var firstBossDialogue=[		
							"Por fin nos conocemos, Xin, \nestaba esper"+'\u00e1' + "ndote",
							"Es rid"+'\u00ed'+"culo si crees que tienes \nalguna posibilidad de derrotarme",
							"Acabar"+ '\u00e9' +" contigo y as"+'\u00ed'+" los Bacab \nno tendr" +'\u00e1' + "n descendencia",
							"y su reino se terminar" +'\u00e1' + " de una \nvez por todas",
							'\u00bf'+"Qu"+ '\u00e9' +"?. "+'\u00bf'+"No lo sab"+'\u00ed'+"as?.",
							"Eres hijo de los Bacab y con tu \nderrota reinar" +'\u00e1' + " el caos...."
					      ]
    //diálogo jefe al morir
	var deathBossDialogue=[
							"Ahhh, Esta vez t" +'\u00fa'+" ganas, \npero volver"+ '\u00e9' +".",
							"Y la pr" +'\u00f3'+"xima vez no vencer"+'\u00e1' + "s..."										   
					   ]			
					   
	var getDialogue= function(dialogueName){
			
			switch (dialogueName){
				case "introDialogue": return introDialogue;	
				case "monkDialogue": return monkDialogue;	
				case "firstBossDialogue": return firstBossDialogue;
				case "deathBossDialogue": return deathBossDialogue;
			}
			
	};
	
//---------------------------------------SPRITES-----------------------------------------------------------------\\

//--------------------PERSONAJE PRINCIPAL---------------------------------

/*
El personaje principal será representado por un sprite rojo, que tiene movimientos en 4 direcciones (Norte,Sur,Este y Oeste)
y que posee un cuchillo
*/
	Q.Sprite.extend("Player",{
		init: function(p) {
				//inicializamos sprites y velocidad inicial
				this._super(p,{
					sprite: "playerAnim",
					sheet: "playerSprites",
					speed: 80,
					moving: false,
					throwing: false,
					playingLowHearts:false,
					INIT_TIME_NEXT_THROW: 0.3,
					timeNextThrow:0,
					INIT_TIME_IMMUNE:1,
					changeOpacityTime:0,
					type: Q.SPRITE_PLAYER,
					collisionMask: Q.SPRITE_DEFAULT | Q.SPRITE_FRIENDLY | Q.SPRITE_ENEMY 
								   | Q.SPRITE_WATER | Q.SPRITE_DOOR | Q.SPRITE_ENEMY_WEAPON |Q.SPRITE_WEAPON,
					direction: "up"
				});
			  //añadimos las componentes para controlarlo
			  this.add("2d, platformerControls, animation,tween");
			  //evento cuchillo
			  Q.input.on("fire",this,"attack");
			  //evento bomba
			  Q.input.on("action",this,"throwBomb");
			  this.on("endThrowing");
			  this.on("die");
			  this.on("hit",this,"collision");
			  //ejecutamos la animación de parado
			  this.play("stand" + this.animationDir());
		},
		step: function(dt){
			//iniciamos el diálogo si es al principio
			if (this.p.initialHouseDialog) {
				Q.stageScene("dialog",2,{dialogueName:"monkDialogue",name:"Yumil"});
				this.p.initialHouseDialog=false;
			}
			this.stage.collide(this);
			//actualizamos el tiempo para poder diparar otro cuchillo
			this.p.timeNextThrow-=dt;
			
			//Cuando nos golpean variamos la opacidad durante un tiempo muentras somos inmunes
			if (this.p.immune) {
			  if ((this.p.changeOpacityTime % 4) == 0) {
				var opacity = (this.p.immuneOpacity == 1 ? 0 : 1);
				this.animate({"opacity":opacity}, 0);
				this.p.immuneOpacity = opacity;
			  }
			  this.p.immuneTimer-=dt;
			  this.p.changeOpacityTime++;
			  if (this.p.immuneTimer < 0) {
				//pasados dos segundos, quitamos la inmunidad
				this.p.immune = false;
				this.animate({"opacity": 1}, 1);
			  }
			}
			if (!this.p.throwing){
				//si no estamos atacando nos podemos mover
				//analizamos la dirección según la tecla pulsada
				//sino se pulsa ninguna, la dirección será la que teníamos
				this.p.direction = Q.inputs['left']  ? 'left' :
							  Q.inputs['right'] ? 'right' :
							  Q.inputs['up']    ? 'up' :
							  Q.inputs['down']  ? 'down' : this.p.direction;
				//Nos estamos moviendo si se ha pulsado alguna tecla de movimiento
				this.p.moving = Q.inputs['left'] || Q.inputs['right'] ||
								Q.inputs['up'] || Q.inputs['down'];
				if (this.p.moving){
					//dependiendo de la dirección no movemos en una dirección o en otra
					//y ejecutamos una animación u otra
					switch(this.p.direction) {
					  case "left": this.p.vx = -this.p.speed; this.p.vy=0; this.play("walkL"); break;
					  case "right":this.p.vx = this.p.speed; this.p.vy=0;this.play("walkR");break;
					  case "up":   this.p.vy = -this.p.speed; this.p.vx=0;this.play("walkU"); break;
					  case "down": this.p.vy = this.p.speed; this.p.vx=0;this.play("walkD"); break;
					  default: this.p.vx=0; this.p.vy=0;
					}		
				}else{
					//no nos movemos 
					this.p.vx=0; this.p.vy=0;	
					var dir = this.animationDir();
					this.play("stand"+ dir);					
				}
			}
			
			if (Q.state.get("actualHearts")>1 && this.p.playingLowHearts){
				Q.audio.stop("PlayerLowHeart.mp3");
				this.p.playingLowHearts=false;
			}
		},
		attack: function(){
			//activamos el ataque, ponemos la animación 
			//e incluimos un cuchillo
			if (this.p.timeNextThrow<=0){
				this.p.throwing=true;
				var dir = this.animationDir();
				Q.audio.play("KnifeThrow.mp3");
				this.play("throw" + dir);
				this.stage.insert(new Q.Knife());
				this.p.timeNextThrow=this.p.INIT_TIME_NEXT_THROW;
			}
		},
		endThrowing: function(){
			//Al finalizar la animación de ataque volvemos al estado normal
			this.p.throwing=false;
			var dir = this.animationDir();
			this.play("stand"+ dir);
		},
		die: function(){
			Q.clearStages();
			Q.stageScene("gameOverTitle");
		},
		animationDir: function(){
			//Devolvemos la letra correspondiente a la dirección actual
			//para facilitarnos la animación
			return this.p.direction=="left" ?"L" : this.p.direction=="right" ?"R" : 
				   this.p.direction=="up" ?"U" : this.p.direction=="down" ?"D":" ";
		
		},
		collision: function(col){
			if(col.obj.isA("Villager")&&Q.inputs['A']){
					Q.audio.play("Dialogue.mp3");
					Q.stageScene("dialog",2, { dialogue: [col.obj.p.dialog], name:col.obj.p.name });
					col.obj.trigger("addPlayer");
			}
			if ((col.obj.p.type==Q.SPRITE_ENEMY || col.obj.p.type==Q.SPRITE_ENEMY_WEAPON ||
				(col.obj.isA("Bomb") && col.obj.p.bursting)) && !this.p.immune){
				this.p.immune = true;
				this.p.immuneTimer = this.p.INIT_TIME_IMMUNE;
				this.p.immuneOpacity = 1;
				this.p.changeOpacityTime=0;
				var damage = col.obj.isA("Bomb") ? col.obj.p.damage/100 : col.obj.p.damage;
				if(Q.state.get("actualHearts")-damage < 0){
					//el valor no puede ser menor que cero
					Q.state.set("actualHearts",0);
				}else{
					Q.audio.play("PlayerHit.mp3");
					Q.state.dec("actualHearts",damage);
					if(Q.state.get("actualHearts")<=1 && !this.p.playingLowHearts){
						Q.audio.play("PlayerLowHeart.mp3",{loop: true});
						this.p.playingLowHearts=true;
					}
				}
				if (Q.state.get("actualHearts")==0){
					this.p.sheet="playerDeathSprites";
					this.del("2d");
					Q.audio.play("PlayerDying.mp3");
					this.play("death",1);
				}
			}
		},
		throwBomb: function(){
			if (canThrowBomb){
				//lanzamos una bomba que explotará
				var dir = this.animationDir();
				this.play("throw" + dir);
				this.stage.insert(new Q.Bomb());	
			}
		}
	});

//----------------------CUCHILLO-------------------------
/*
el cuchillo está representada por un sprite que tiene dos sheets, uno para el cuchillo en vertical
y otro para la horizontal. Cuando se crea un cuchillo, se calcula su posición y su animación
en función de la posición del personaje principal
*/
	Q.Sprite.extend("Knife",{
		init: function(p) {
				this._super(p,{
					sprite: "KnifeAnim",
					speed:130,
					type: Q.SPRITE_WEAPON,
					collisionMask: Q.SPRITE_DEFAULT | Q.SPRITE_FRIENDLY | Q.SPRITE_ENEMY | Q.SPRITE_DOOR,
					damage:25
				});
			  this.add("2d, animation"); 
			  this.on("hit",this,"destroyKnife");
			  //añadimos las componentes y calculamos la posición donde se dibujará
			  this.calculatePosition();
			  this.calculateSpeed();
		},
		calculatePosition: function (){
			var player = Q("Player").first();
			var dir=player.p.direction;
			switch(dir){
			  case "left": this.posLeft(player); break;
			  case "right":this.posRight(player); break;
			  case "up":   this.posUp(player); break;
			  case "down": this.posDown(player); break;
			}
			this.p.direction=dir;
			//realizamos la animación
			this.play("throw" + player.animationDir());
		},
		posLeft: function(player){
			this.generateKnife("H");
			this.p.x=player.p.x-this.p.w;
			this.p.y=player.p.y+player.p.h/4;
		},
		posRight: function(player){
			this.generateKnife("H");
			this.p.x=player.p.x+player.p.w;
			this.p.y=player.p.y+player.p.h/4;
		},
		posUp: function(player){
			this.generateKnife("V");
			this.p.x=player.p.x;
			this.p.y=player.p.y-this.p.h;
		},
		posDown: function(player){
			this.generateKnife("V");	
			this.p.x=player.p.x+player.p.w/4;
			this.p.y=player.p.y+player.p.h;
		},
		generateKnife:function (dir){
			//calculamos el tamaño del sprite 
			//en función de si es horizontal o vertical
			switch(dir){
				case "H": this.p.sheet="horizontalKnife";
						  this.p.w=16;
						  this.p.h=8;
						  this.p.cx=8;
						  this.p.cy=4;
						  break;
				case "V": this.p.sheet="verticalKnife";
						  this.p.w=8;
					      this.p.h=16;
						  this.p.cx=4;
						  this.p.cy=8;
						  break;			
			}
			//generamos la matriz de puntos del sprite
			Q._generatePoints(this,true);
		},
		destroyKnife: function(col){
			if (!col.obj.isA("Player")){
				if (col.obj.p.type==Q.SPRITE_DEFAULT) Q.audio.play("KnifeWallCollision.mp3");
				this.destroy();
			}
		},
		calculateSpeed: function(){
			this.p.vx= this.p.direction=="right" ? this.p.speed : 
					   this.p.direction=="left" ? -this.p.speed : 0;
			this.p.vy= this.p.direction=="down" ? this.p.speed : 
					   this.p.direction=="up" ? -this.p.speed : 0;		
		},
		step: function(dt){
			this.stage.collide(this);
		}
	});
	
	
//----------------------BOMBA-------------------------
/*
La bomba es otra arma de nuestro jugador que se consigue tras hablar con el monje.
Se lanza utilizando la tecla "x" y tiene dos sprites,uno antes de explotar y otro después
*/
	Q.Sprite.extend("Bomb",{
		init: function(p) {
				this._super(p,{
					sprite: "bombAnim",
					sheet: "bombSprite",
					bursting: false,
					type: Q.SPRITE_WEAPON,
					collisionMask: Q.SPRITE_DEFAULT | Q.SPRITE_FRIENDLY | Q.SPRITE_ENEMY | Q.SPRITE_ENEMY_BOSS
								   | Q.SPRITE_WEAPON | Q.SPRITE_PLAYER,
					damage:50,
					hasCollide:false
				});
			  this.add("2d, animation"); 
			  this.on("burst");
			  this.on("destroy",this,"remove");
			  //añadimos las componentes y calculamos la posición donde se dibujará
			  this.calculatePosition();
		},
		 sensor: function(colObj) {
		
		 },
		burst: function(){
			this.p.sensor=true;
			this.on("sensor");
			//cambiamos los sprites y recalculamos su matriz
			this.p.sprite="bombBurstAnim";
			this.p.sheet="bombBurstSprite"
			this.p.w=45;
			this.p.h=45;
			this.p.cx=this.p.cy=22.5;
			Q._generatePoints(this,true);
			this.p.bursting=true;
			//movemos 1 pixel para que detecte las colisiones
			this.p.x--;
			this.p.y--;
			Q.audio.play("BombBurst.mp3");
			this.play("burst");
		},
		remove: function(){
			this.destroy();		
		},
		calculatePosition: function(){
			//calculamos la posición e iniciamos la animación
			var player = Q("Player").first();
			var dir=player.p.direction;
			switch(dir){
			  case "left": this.posLeft(player); break;
			  case "right":this.posRight(player); break;
			  case "up":   this.posUp(player); break;
			  case "down": this.posDown(player); break;
			}
			this.play("stand");
		
		},
		posLeft: function(player){
			this.p.x=player.p.x-this.p.w;
			this.p.y=player.p.y+player.p.h/4;
		},
		posRight: function(player){
			this.p.x=player.p.x+player.p.w;
			this.p.y=player.p.y+player.p.h/4;
		},
		posUp: function(player){
			this.p.x=player.p.x;
			this.p.y=player.p.y-this.p.h;
		},
		posDown: function(player){
			this.p.x=player.p.x+player.p.w/4;
			this.p.y=player.p.y+player.p.h;
		},
		step: function(dt){
			this.stage.collide(this);
		}
	});
	
//--------------------------------CIUDADANOS
/*
 Los ciudadanos son personajes del juego que se sitúan en una zona concreta y se mueven en esa zona.
 Los ciudadanos tienen diálogo, que cuando el personaje principal pulse el botón del diálogo, se mostrará por 
 pantalla.
*/

	Q.Sprite.extend("Villager",{
		init: function(p) {
				this._super(p,{
					sprite:"villagerAnim",
					sheet: "villager5Sprite",//ciudadano por defecto
					speed:50,
					INITIAL_TIME_WATING: 2,//2 segundos esperando al cambiar de dirección
					actualTimeWating: 0,
					distance: 30, //distancia recorrida en cada direccion
					dialog: "S"+'\u00e1'+"lvanos, estamos en tus manos",//diálogo por defecto
					name: "Ciudadano",
					//distancia en la se encuentra el movimiento
					minX:0,
					maxX:0,
					minY:0,
					maxY:0,
					direction: "down",//dirección de movimiento inicial
					canMove: true, //por defecto se estará moviendo
					type: Q.SPRITE_FRIENDLY,
					collisionMask: Q.SPRITE_DEFAULT | Q.SPRITE_PLAYER | Q.SPRITE_ENEMY | Q.SPRITE_ENEMY_WEAPON
				});
			  this.add("2d, animation"); 
			  this.initMovement();
			  this.on("addPlayer");
			  this.p.actualTimeWating = this.p.INITIAL_TIME_WATING;
		},
		step: function(dt){
		   this.stage.collide(this);
		   if (this.p.canMove){
			//El ciudadano estará moviéndose si su atributo se lo permite
				this.p.actualTimeWating -= dt;
				if (this.p.actualTimeWating<=0){
					//nos movemos según la dirección
					this.move();
					//cambiamos la dirección se hemos llegado al límite
					this.checkChangeDirection();
				}else{
					//no se mueve 
					this.p.vx=0;this.p.vy=0;
				}
		   }else{
				//no se mueve 
				this.p.vx=0;this.p.vy=0;
		   }
		},
		initMovement: function(){
			//inicializamos el cuadrado por donde puede moverse 
			//el ciudadano
			this.p.minX=this.p.x - this.p.distance;
			this.p.maxX=this.p.x;
			this.p.minY=this.p.y;
			this.p.maxY=this.p.y + this.p.distance;		
		},
		move: function(){
			//Nos movemos en función de nuestra dirección
			switch(this.p.direction) {
					  case "left": this.p.vx = -this.p.speed; this.p.vy=0; this.play("walkL"); break;
					  case "right":this.p.vx = this.p.speed; this.p.vy=0;this.play("walkR");break;
					  case "up":   this.p.vy = -this.p.speed; this.p.vx=0;this.play("walkU"); break;
					  case "down": this.p.vy = this.p.speed; this.p.vx=0;this.play("walkD"); break;
					  default: this.p.vx=0; this.p.vy=0;
			}	
		},
		checkChangeDirection:function (){
			var dir =this.p.direction;
			//cambiamos la dirección si hemos llegado al límite del movimiento
			this.p.direction= this.p.x<=this.p.minX && this.p.y<=this.p.minY ? "right" :
							  this.p.x<=this.p.minX && this.p.y>=this.p.maxY ? "up" :
							  this.p.x>=this.p.maxX && this.p.y>=this.p.maxY ? "left":
							  this.p.x>=this.p.maxX && this.p.y<=this.p.minY ? "down" :
							  this.p.direction;
			//si hemos cambiado la dirección, reiniciamos el temporizador de espera
			this.p.actualTimeWating = dir != this.p.direction ? this.p.INITIAL_TIME_WATING 
															  : this.p.actualTimeWating;
		},
		addPlayer: function(){
			if((this.p.name=="Madre"&& !hasTalkedMom) || (this.p.name=="Viajero" && !hasTalkedTraveler)){
				//añadimos vida
				Q.audio.play("GetHeartPeace.mp3");
				Q.state.inc("totalHearts",1);
				hasTalkedMom = this.p.name == "Madre" || hasTalkedMom;
				hasTalkedTraveler = this.p.name == "Viajero" || hasTalkedTraveler;
				Q.audio.stop("PlayerLowHeart.mp3");
			}else if (this.p.name=="Yakum" && !canThrowBomb){
				//añadimos bombas
				Q.audio.play("EarnBombs.mp3");
				Q.state.set("throwBombs",1);
			}else if (this.p.name=="Yumil"){
				//restauramos vida
				Q.audio.stop("PlayerLowHeart.mp3");
				Q("Player").first().p.playingLowHearts=false;
				Q.state.set("actualHearts",Q.state.get("totalHearts"));
			}
		}
	});
	
//------------------------------ENEMIGOS------------------------------------//


//--------------Launcher Enemy

	Q.Sprite.extend("LauncherEnemy",{
			init: function(p) {
						this._super(p,{
					sprite:"launcherAnim",
					sheet: "launcherEnemySprites",
					speed:50,
					live:25,
					INITIAL_TIME_WATING: 2,//2 segundos esperando al cambiar de dirección
					actualTimeWating: 0,
					distance: 30, //distancia recorrida en cada direccion
					//distancia en la se encuentra el movimiento
					minX:0,
					maxX:0,
					minY:0,
					maxY:0,
					direction: "down",//dirección de movimiento inicial
					canMove: true, //por defecto se estará moviendo,
					damage: 0.25
				});
			  this.add("defaultEnemy"); 
			  this.addEventPlayerCollision();
			  this.initMovement();
			  this.p.actualTimeWating = this.p.INITIAL_TIME_WATING;
		},
		step: function(dt){
		   this.stage.collide(this);
		   if (this.p.canMove){
			//El ciudadano estará moviéndose si su atributo se lo permite
				this.p.actualTimeWating -= dt;
				if (this.p.actualTimeWating<=0){
					//nos movemos según la dirección
					this.move();
					//cambiamos la dirección se hemos llegado al límite
					this.checkChangeDirection();
				}else{
					//no se mueve 
					this.p.vx=0;this.p.vy=0;
				}
		   }else{
				//no se mueve 
				this.p.vx=0;this.p.vy=0;
		   }
		},
		initMovement: function(){
			//inicializamos el cuadrado por donde puede moverse 
			//el ciudadano
			this.p.minX=this.p.x - this.p.distance;
			this.p.maxX=this.p.x;
			this.p.minY=this.p.y;
			this.p.maxY=this.p.y + this.p.distance;		
		},
		move: function(){
			//Nos movemos en función de nuestra dirección
			switch(this.p.direction) {
					  case "left": this.p.vx = -this.p.speed; this.p.vy=0; this.play("walkL"); break;
					  case "right":this.p.vx = this.p.speed; this.p.vy=0;this.play("walkR");break;
					  case "up":   this.p.vy = -this.p.speed; this.p.vx=0;this.play("walkU"); break;
					  case "down": this.p.vy = this.p.speed; this.p.vx=0;this.play("walkD"); break;
					  default: this.p.vx=0; this.p.vy=0;
			}	
		},
		checkChangeDirection:function (){
			var dir =this.p.direction;
			//cambiamos la dirección si hemos llegado al límite del movimiento
			this.p.direction= this.p.x<=this.p.minX && this.p.y<=this.p.minY ? "right" :
							  this.p.x<=this.p.minX && this.p.y>=this.p.maxY ? "up" :
							  this.p.x>=this.p.maxX && this.p.y>=this.p.maxY ? "left":
							  this.p.x>=this.p.maxX && this.p.y<=this.p.minY ? "down" :
							  this.p.direction;
			//si hemos cambiado la dirección, reiniciamos el temporizador de espera
			this.p.actualTimeWating = dir != this.p.direction ? this.p.INITIAL_TIME_WATING 
															  : this.p.actualTimeWating;
            if (dir!=this.p.direction){
				var x = dir=="left" ? this.p.x-15 : 
						dir == "right" ? this.p.x+this.p.w+1 :
						dir == "down" ? this.p.x+1 :
						dir == "up" ? this.p.x + 1 : this.p.x ;
				var y = dir=="left" ? this.p.y+1 : 
						dir == "right" ? this.p.y+1 :
						dir == "down" ? this.p.y + this.p.h+1 :
						dir == "up" ? this.p.y-15 :this.p.y;
				//si hemos llegado a cambiar dirección,
				//lanzamos una bola 
				this.stage.insert(new Q.LauncherBall({direction:dir,x:x,y:y}));
			}
		},
		die: function(){
			Q.audio.play("EnemyDying.mp3");
			this.destroy();
		}
	});
	
//--------------Wizard Enemy
/*
Enemigo que representa un mago, habrá que indicarle el sheet que le corresponde
y si es de hielo o de fuego. por defecto es de fuego. El enemigo lanzará hechizos al jugador
si éste está a una distancia cercana
*/

	Q.Sprite.extend("WizardEnemy",{
			init: function(p) {
						this._super(p,{
					sprite:"wizardAnim",
					speed:75,
					spellType:"fire",
					damage: 0.25,
					direction:"down",
					live: 50,
					INITIAL_TIME_SPELL: 2,//2 segundos esperando a volver a lanzar un hechizo
					actualTimeSpelling: 0,
					DISTANCE_TO_FIRE: 100, //distancia a la que tiene que estar el juagador para ser atacado
					canMove:false
				});
			  this.add("defaultEnemy"); 
			  this.addEventPlayerCollision();
			  this.p.actualTimeSpelling = this.p.INITIAL_TIME_SPELL;
		},
		step: function(dt){
		   this.stage.collide(this);
		   //recupero el jugador y sus coordenadas
		   var player = Q("Player").first();
		   if (player){
			   var x=player.p.x,y=player.p.y;
			   //Actuamos si el jugador está en la distancia correcta
			   var follow= (Math.abs(this.p.x-x)<=this.p.DISTANCE_TO_FIRE)&& (Math.abs(this.p.y-y)<=this.p.DISTANCE_TO_FIRE);
			   this.p.actualTimeSpelling-=dt;
			   if (follow){
					//calculamos la dirección y velocidad del hechizo usando vectores
					var vx=x-this.p.x, vy=y-this.p.y;
					var absVX=Math.abs(vx),absVY=Math.abs(vy);
					var dir = (vx>0&&absVX>=absVY) ? "right" : (vx<0 && absVX>=absVY) ? "left" :
							  (vy>0 && absVY>absVX) ? "down" : "up";
					this.p.direction=dir
					var dirAnim= this.p.direction=="left" ?"L" : this.p.direction=="right" ?"R" : 
								 this.p.direction=="up" ?"U" : "D";	
					//si nos podemos mover perseguimos al jugador, sino solo lo miramos
					if (this.p.canMove){
						//Nos movemos con la mitad de velocidad que el hechizo
						this.p.vx=vx/2;
						this.p.vy=vy/2;		
						//ejecutamos la animación
						this.play("walk"+dirAnim);
					}else{
						//miramos en la dirección correcta
						this.play("stand"+dirAnim);
					}
					if (this.p.actualTimeSpelling<=0){
						//lanzamos el hechizo en la dirección que se encuentre
						//Miramos el tipo de sprite (hielo o fuego)
						var sheetType = (this.p.spellType=="ice")? "IceSpell" : "FireBallSpell";
						//calculamos el resto del sheet en función de la dirección
						var sheet = (dir == "right" || dir == "left")? sheetType+"HSprite" : sheetType+"VSprite";
						Q.audio.play("EnemySpell.mp3");
						//lanzamos el hechizo en la dirección que se encuentre
						this.stage.insert(new Q.Spell({sheet:sheet,vx:vx,vy:vy,direction:dir,x:this.p.x,y:this.p.y}));
						//inicializamos el contador para volver a lanzar
						this.p.actualTimeSpelling = this.p.INITIAL_TIME_SPELL;
					}		   
			   }
			}
		},
		die: function(){
			Q.audio.play("EnemyDying.mp3");
			this.destroy();
		}
	});
	
//--------------MASTER CHIEF
/*
Enemigo que representa el demonio final. El enemigo lanzará hechizos al jugador y tendrá una vida
mucho más grande que el resto de enemigos
*/

	Q.Sprite.extend("MasterDemon",{
			init: function(p) {
						this._super(p,{
					sprite:"bossAnim",
					sheet:"bossThrowSpellH",
					damage: 0.5,
					direction:"left",
					INITIAL_LIVE:totalBossLive,
					live: totalBossLive,
					INITIAL_TIME_SPELL: 2.5,//2,5 segundos esperando a volver a lanzar un hechizo
					actualTimeSpelling: 0,
					DISTANCE_TO_FIRE: 200, //distancia a la que tiene que estar el juagador para ser atacado
					isDeath: false,
					throwBigSpell:false,
					throwingBigSpell:false,
					posYBigSpell:0,
					posXBigSpell:0,
					firstBossDialogue:true
				});
			  this.add("defaultEnemy"); 
			  this.on("death");
			  this.on("throwBigSpell");
			  this.addEventPlayerCollision();
			  this.p.type=Q.SPRITE_ENEMY_BOSS;
			  this.p.actualTimeSpelling = this.p.INITIAL_TIME_SPELL;
			  this.play("standRU");
		},
		step: function(dt){
			//actualizamos la barra de vida
			Q.state.set("bossLive",this.p.live);
			//iniciamos el diálogo si es al principio
			if (this.p.firstBossDialogue) {
				Q.stageScene("dialog",2,{dialogueName:"firstBossDialogue",name:"Xibalb"+'\u00e1'});
				this.p.firstBossDialogue=false;
			}
			if (!this.p.isDeath && !this.p.throwingBigSpell){
			   this.stage.collide(this);
			   //recupero el jugador y sus coordenadas
			   var player = Q("Player").first();
			   if (player){
				   var x=player.p.x,y=player.p.y;
				   this.p.actualTimeSpelling-=dt;
				   //calculamos la dirección y velocidad del hechizo usando vectores
					var vx=x-this.p.x, vy=y-this.p.y;
					var absVX=Math.abs(vx),absVY=Math.abs(vy);
					var dir = (vx>0&&absVX>=absVY) ? "right" : (vx<0 && absVX>=absVY) ? "left" :
							  (vy>0 && absVY>absVX) ? "down" : "up";
					this.p.direction=dir
					var dirAnim= (dir=="left"|| dir == "down") ?"LD" : "RU";
					//calculamos si el sprite es horizontal o vertical				
					var dirHV=(dir == "right" || dir == "left")? "H" : "V";
					//cambiamos el sprite en función de dirHV
					if (dirHV=="H") this.changeToSpellH();
					else this.changeToSpellV();
					this.play("stand"+dirAnim);
				   if (this.p.actualTimeSpelling<=0){
						if (!this.p.throwBigSpell){
							var sheetType = "BossSpell";
							//calculamos el resto del sheet en función de la dirección
							var sheet = sheetType+dirHV;
							var frame= (dir == "up" || dir == "left")? 0 : 1;
							Q.audio.play("EnemySpell.mp3");
							this.play("spell"+dirAnim,1);
							//lanzamos el hechizo en la dirección que se encuentre
							this.stage.insert(new Q.BossSpell({sheet:sheet,vx:vx,vy:vy,direction:dir,x:this.p.x,y:this.p.y,frame:frame}));
							this.p.actualTimeSpelling = this.p.INITIAL_TIME_SPELL;
						}else{
							//actualizamos el sprite y lanzamos el hechizo grande
							this.changeToBigSpell();
							this.p.posYBigSpell=this.p.y+vy;
							this.p.posXBigSpell=this.p.x+vx;
							this.p.throwingBigSpell=true;
							Q.audio.play("BossBigSpellCharge.mp3");
							this.play("bigSpell",1);
						}
						
					}		   
				}
				
				//si la vida es menor que el 50% lanzamos los hechizos más rápidos
				if (this.p.live<=this.p.INITIAL_LIVE*0.50) {
					this.p.INITIAL_TIME_SPELL=2;
				}
				//si la vida es menor que el 25% lanzamos un hechizo más fuerte
				if (this.p.live<=this.p.INITIAL_LIVE*0.25) {
					this.p.throwBigSpell=true;
					this.p.INITIAL_TIME_SPELL=3.5;
				}
			}else if (this.p.isDeath){this.p.sheet="bossDie";}
		},
		die: function(){
			if (!this.p.isDeath){
				//actualizamos la barra de vida
				Q.state.set("bossLive",this.p.live);
				//ejecutamos la animación de muerte que finaliza lanzando un evento
				this.changeToDeath();
				Q.stageScene("dialog",2,{dialogueName:"deathBossDialogue",name:"Xibalb"+'\u00e1'});
				this.p.isDeath=true;
				Q.audio.stop();
				Q.audio.play("BossDying.mp3",{loop: true});
				this.play("die",2);
			}
		},
		death: function(){
			Q.audio.stop();
			//destruimos al jefe y cargamos la escena de fin
			this.destroy();
			Q.clearStages();
			Q.stageScene("endGameTitle");
		},
		changeToDeath: function(){
			this.p.sheet="bossDie";
			this.p.w=32;
			this.p.h=16;
			this.p.cx=16;
			this.p.cy=8;
			Q._generatePoints(this,true);
		},
		changeToSpellH: function(){
			this.p.sheet="bossThrowSpellH";
			this.p.w=22;
			this.p.h=32;
			this.p.cx=11;
			this.p.cy=16;
			Q._generatePoints(this,true);
		},
		changeToSpellV: function(){
			this.p.sheet="bossThrowSpellV";
			this.p.w=this.p.h=34;
			this.p.cx=this.p.cy=17;
			Q._generatePoints(this,true);
		},
		changeToBigSpell: function(){
			this.p.sheet="bossThrowBigSpell";
			this.p.w=34;
			this.p.h=32;
			this.p.cx=17;
			this.p.cy=16;
			Q._generatePoints(this,true);
		},
		throwBigSpell: function(){
			//hechizo grande
			this.stage.insert(new Q.BigBossSpell({x:this.p.posXBigSpell,y:this.p.posYBigSpell,frame:0}));
			this.p.actualTimeSpelling = this.p.INITIAL_TIME_SPELL;
			this.p.throwingBigSpell=false;
		}
	});
	
//------------------------BOLA ENEMIGA
	Q.Sprite.extend("LauncherBall",{
			init: function(p) {
				this._super(p,{
					sheet: "ball",
					direction:"down",//direccion por defecto
					speed: 100,
					type: Q.SPRITE_ENEMY_WEAPON,
					collisionMask:Q.SPRITE_DEFAULT | Q.SPRITE_PLAYER | Q.SPRITE_ENEMY,
					damage: 0.25 //daño que hace
				});
			  this.add("2d");
			  this.calculateSpeed();
			  this.on("hit",this,"collision");
		},
		calculateSpeed: function(){
			this.p.vx= this.p.direction=="right" ? this.p.speed : 
					   this.p.direction=="left" ? -this.p.speed : 0;
			this.p.vy= this.p.direction=="down" ? this.p.speed : 
					   this.p.direction=="up" ? -this.p.speed : 0;		
		},
		collision: function(col){
			this.destroy();
		},
		step: function(){
			this.stage.collide(this);
		}
	});

//------------------------HECHIZOS
/*
Hechizos que lanzan los enemigos. Hay que indicar si es de fuego o de hielo
*/
	Q.Sprite.extend("Spell",{
			init: function(p) {
				this._super(p,{
					sprite:"spellAnim",//animación del hechizo
					direction:"down",//direccion por defecto
					type: Q.SPRITE_ENEMY_WEAPON,
					collisionMask:Q.SPRITE_DEFAULT | Q.SPRITE_PLAYER,
					damage: 0.5 //daño que hace
				});
			  this.add("2d, animation");
			  this.calculateAnim();
			  this.on("hit",this,"collision");
		},
		calculateAnim: function(){
			var anim= (this.p.direction=="right" || this.p.direction=="down")? "spellRD": "spellLU";
		    this.play(anim);
		},
		collision: function(col){
			this.destroy();
		},
		step: function(){
			this.stage.collide(this);
		}
	});
	
//------------------------HECHIZOS DEL JEFE
/*
Hechizos que lanza el demonio final. Hay que indicar el sheet que es
*/
	Q.Sprite.extend("BossSpell",{
			init: function(p) {
				this._super(p,{
					//sprite:"spellAnim",//animación del hechizo
					type: Q.SPRITE_ENEMY_WEAPON,
					collisionMask:Q.SPRITE_DEFAULT | Q.SPRITE_PLAYER,
					damage: 0.5 //daño que hace por defecto
				});
			  this.add("2d");
			  this.on("hit",this,"collision");
		},
		collision: function(col){
			this.destroy();
		},
		step: function(){
			this.stage.collide(this);
		}
	});
	
/*
Hechizos que lanza el demonio final. Hay que indicar el sheet que es
*/
	Q.Sprite.extend("BigBossSpell",{
			init: function(p) {
				this._super(p,{
					sheet:"BossBigSpell",
					type: Q.SPRITE_ENEMY_WEAPON,
					collisionMask:Q.SPRITE_NONE,
					damage: 0.25, //daño que hace por defecto
					TIME_TO_DESTROY:0.5,
					sensor:true
				});
			  this.add("2d");
			  this.on("sensor");
		},
		step: function(dt){
			this.stage.collide(this);
			this.p.TIME_TO_DESTROY-=dt;
			if (this.p.TIME_TO_DESTROY<=0) this.destroy();
		},
		 sensor: function(colObj) {
		
		 }
	});

//--------------------------------------PUERTAS---------------------------------------

	Q.Sprite.extend("LevelDoor",{
			init: function(p) {
				this._super(p,{
					type: Q.SPRITE_DOOR,
					collisionMask:Q.SPRITE_NONE
				});
			  this.add("2d");
			  this.on("hit",this,"collision");
		},
		collision: function(col){
			if (col.obj.isA("Player") && this.p.nextLevel){
				var ficheroTMX =this.p.nextLevel+".tmx";
				var escena =this.p.nextLevel;
				Q.stage(0).pause();
				Q.loadTMX(ficheroTMX,function(){
					Q.stageScene(escena); 
					Q.stage(0).unpause(); 
					if (escena!="BossChambreLevel")actualPlayerLevel=escena;
				});
			}
		},
		step: function(dt){
			this.stage.collide(this);		
		}
	});
	
//-------Agua------------	

	Q.Sprite.extend("Water",{
			init: function(p) {
					this._super(p,{
						sheet:"OutsideTemple",
						frame:66,
						type:Q.SPRITE_WATER,
						collisionMask:Q.SPRITE_DEFAULT | Q.SPRITE_PLAYER | Q.SPRITE_ENEMY
					});	
					
			},
			step: function(dt){
				this.stage.collide(this);
			}
	});	
	
//-------PANTALLA DE INICIO-----------------		
		
	Q.Sprite.extend("MainTitle",{
		init: function(p) {
				this._super(p,{
					sheet: "mainTitle"
				});	
		}
	});	
	
//-------PANTALLA DE CONTROLES-----------------		
		
	Q.Sprite.extend("Controls",{
		init: function(p) {
				this._super(p,{
					sheet: "Controls"
				});	
		}
	});
	
//-------PANTALLA DE CREDITOS-----------------		
		
	Q.Sprite.extend("Credits",{
		init: function(p) {
				this._super(p,{
					sheet: "Credits"
				});	
		}
	});
	
//-------PANTALLA DE FIN DE JUEGO-----------------		
		
	Q.Sprite.extend("EndGameTiled",{
		init: function(p) {
				this._super(p,{
					sheet: "endGameTitle"
				});	
		}
	});	
	
//-------PANTALLA DE GAME OVER-----------------		
		
	Q.Sprite.extend("GameOverTiled",{
		init: function(p) {
				this._super(p,{
					sheet: "gameOverTitle"
				});	
		}
	});	
	
	
//-------CUADRO DE DIALOGO-----------------		
		
	Q.Sprite.extend("DialogueBackground",{
		init: function(p) {
				this._super(p,{
					sheet: "dialogueBackground",
					dialogue: [],
					actual: 0,//valor de la actual parte del dialogo
					name: ""
				});	
				//Añadimos el evento al hacer click en la tecla intro
				Q.input.on("A",this,"nextText");
		},
		nextText: function(){		
			if (this.hasNextText()){
				this.p.actual++;
				Q.state.set("dialogueText",this.p.dialogue[this.p.actual]);
			}else{
				if (this.p.firstDialogue){
					Q.clearStage(2);
					Q.stageScene('initialHouseLevel');
					Q.stageScene('hud',1);
				}else{
					Q.clearStage(2);
					Q.stage(0).unpause();
				}
			}			
		},
		hasNextText:function(){
			return this.p.actual+1<this.p.dialogue.length;		
		}
	});	

//----------------------------------------HUD------------------	
	
//-------CORAZONES HUD-----------------	

Q.Sprite.extend("HeartHUD",{
		init: function(p) {
				this._super(p,{
					sheet:"Heart"
				});	
				
		}
});	
//-------CAJAS DE ARMAS HUD------------	

Q.Sprite.extend("WeaponBoxHUD",{
		init: function(p) {
				this._super(p);	
				
		}
});	

//------------------------------------COMPONENTE DEFAULT ENEMY------------------------------------------------

Q.component("defaultEnemy", {
	extend: {
		addEventPlayerCollision: function(){
			//añadimos el tipo de sprite y su máscara de colisión
			this.p.type=Q.SPRITE_ENEMY;
			this.p.collisionMask=Q.SPRITE_PLAYER | Q.SPRITE_WEAPON | Q.SPRITE_DEFAULT | Q.SPRITE_FRIENDLY;
			//añadimos las componentes de los enemigos
			this.add('2d, animation');
			//añadimos los eventos de colisión
			
			this.on("hit",this,"damage");
			this.on("die");
		},
		damage: function(col){
			if (col.obj.p.type==Q.SPRITE_WEAPON && 
			   (!col.obj.isA("Bomb") || (col.obj.isA("Bomb") && col.obj.p.bursting 
				&& !(this.p.type==Q.SPRITE_ENEMY_BOSS && col.obj.p.hasCollide)))){
				//si es una bomba y está explotando quitamos vida al enemigo
				this.p.live-=col.obj.p.damage;
					//si muere
				if (this.p.live<=0){
					this.p.live=0;
					this.trigger("die");
				}else{
					Q.audio.play("EnemyHit.mp3");
				}	
				if (this.p.type==Q.SPRITE_ENEMY_BOSS && col.obj.isA("Bomb")){
					col.obj.p.hasCollide=true;
				}
			}
				
		}
	}
});
		
//--------------------------------------ESCENAS----------------------------------------------\\
								
//-------ESCENA DEL NIVEL DE LA CASA-----------------
	Q.scene('initialHouseLevel',function(stage) {
		//asociamos el nivel al escenario
		Q.stageTMX("initialHouseLevel.tmx",stage);
		stage.add("viewport");
		stage.viewport.scale=1.5;
		var player = Q("Player").first();
		//multiplico los máximos por la escala
		stage.follow(player,{x: true, y: true},{minX: 0, maxX: 480, minY: 0, maxY: 480});
		//paramos los audios
		Q.audio.stop();
		//ejecutamos el audio principal, que se repita
		Q.audio.play("InsideHouse.mp3",{ loop: true });
	});
	
//-------ESCENA DEL NIVEL DEL POBLADO-----------------
	Q.scene('VillageHouseLevel',function(stage) {
		//asociamos el nivel al escenario
		Q.stageTMX("VillageHouseLevel.tmx",stage);
		stage.add("viewport");
		stage.viewport.scale=1.5;
		var player = Q("Player").first();
		//multiplico los máximos por la escala
		stage.follow(player,{x: true, y: true},{minX: 0, maxX: 1200, minY: 0, maxY: 960});
		//paramos los audios
		Q.audio.stop("InsideHouse.mp3");
		//ejecutamos el audio principal, que se repita
		Q.audio.play('MusicaMaya.mp3',{ loop: true });
	});
	
//-------ESCENA DEL NIVEL DEL POBLADO-----------------
	Q.scene('VillageTempleLevel',function(stage) {
		//asociamos el nivel al escenario
		Q.stageTMX("VillageTempleLevel.tmx",stage);
		stage.add("viewport");
		stage.viewport.scale=1.5;
		var player = Q("Player").first();
		//multiplico los máximos por la escala
		stage.follow(player,{x: true, y: true},{minX: 0, maxX: 1200, minY: 0, maxY: 960});
	});
	
//-------ESCENA DEL NIVEL AFUERAS DEL TEMPLO-----------------
	Q.scene('TempleEntranceLevel',function(stage) {
		//asociamos el nivel al escenario
		Q.stageTMX("TempleEntranceLevel.tmx",stage);
		stage.add("viewport");
		stage.viewport.scale=1.5;
		var player = Q("Player").first();
		//multiplico los máximos por la escala
		stage.follow(player,{x: true, y: true},{minX: 0, maxX: 480, minY: 0, maxY: 480});
	});
	
//-------ESCENA DEL NIVEL AFUERAS DEL TEMPLO ARRIBA-----------------
	Q.scene('TempleEntranceTLevel',function(stage) {
		//asociamos el nivel al escenario
		Q.stageTMX("TempleEntranceTLevel.tmx",stage);
		stage.add("viewport");
		stage.viewport.scale=1.5;
		var player = Q("Player").first();
		//multiplico los máximos por la escala
		stage.follow(player,{x: true, y: true},{minX: 0, maxX: 480, minY: 0, maxY: 480});
		//paramos los audios
		Q.audio.stop("MusicaTemploMaya.mp3");
		//ejecutamos el audio principal, que se repita
		Q.audio.play('MusicaMaya.mp3',{ loop: true });
	});
	
//-------ESCENA DEL NIVEL DEL TEMPLO DESDE FUERA-----------------
	Q.scene('TempleOLevel',function(stage) {
		//asociamos el nivel al escenario
		Q.stageTMX("TempleOLevel.tmx",stage);
		stage.add("viewport");
		stage.viewport.scale=1.5;
		var player = Q("Player").first();
		//multiplico los máximos por la escala
		stage.follow(player,{x: true, y: true},{minX: 0, maxX: 960, minY: 0, maxY: 720});
		//paramos los audios
		Q.audio.stop("MusicaMaya.mp3");
		//ejecutamos el audio principal, que se repita
		Q.audio.play('MusicaTemploMaya.mp3',{ loop: true });
		
	});
	
//-------ESCENA DEL NIVEL HABITACION DEL JEFE----------------
	Q.scene('BossChambreLevel',function(stage) {
		//asociamos el nivel al escenario
		Q.stageTMX("BossChambreLevel.tmx",stage);
		stage.add("viewport");
		stage.viewport.scale=1.5;
		var player = Q("Player").first();
		//multiplico los máximos por la escala
		stage.follow(player,{x: true, y: true},{minX: 0, maxX: 360, minY: 0, maxY: 480});
		//paramos los audios
		Q.audio.stop("MusicaTemploMaya.mp3");
		//ejecutamos el audio principal, que se repita
		Q.audio.play('MusicaTemplo.mp3',{ loop: true });
		Q.state.set("showBossLive",1);
		
	});
	
//-------ESCENA DEL NIVEL CASA DURANTE EL JUEGO-----------------
	Q.scene('HouseLevel',function(stage) {
		//asociamos el nivel al escenario
		Q.stageTMX("HouseLevel.tmx",stage);
		stage.add("viewport");
		stage.viewport.scale=1.5;
		var player = Q("Player").first();
		//multiplico los máximos por la escala
		stage.follow(player,{x: true, y: true},{minX: 0, maxX: 480, minY: 0, maxY: 480});
		//paramos la música de la escena anterior
		Q.audio.stop("MusicaMaya.mp3");
		//ejecutamos el audio principal, que se repita
		Q.audio.play('InsideHouse.mp3',{ loop: true });
	});
	
//-------ESCENA PANTALLA DE INICIO-----------------	
	Q.scene('mainTitle',function(stage) {
		//Insertamos el título en la escena
		var title =stage.insert(new Q.MainTitle({x: Q.width/2, y: Q.height/2}));
		//insertamos un contenedor de elementos en el escenario
		var container = stage.insert(new Q.UI.Container({
								x: Q.width/2, y: Q.height/2, fill: "rgba(0,0,0,0)"
								}));
        var w=160,h=50,font="bold 30px Curiel";								   
		//insertamos un botón para empezar el juego
		var playButton = container.insert(new Q.UI.Button({ x: 0, y: 0, fill: "rgba(0,0,0,0.3)",
						label: "Jugar",w:w,h:h,font:font }));
		playButton.on("click",function() {
			Q.audio.play("MenuSelect.mp3");
			Q.stageScene('initialDialogue',2);
		});
	   //insertamos un botón para los créditos
		var creditButton = container.insert(new Q.UI.Button({ x: 0, y: 55, fill: "rgba(0,0,0,0.3)",
						label: "Cr"+'\u00e9'+"ditos" ,w:w,h:h,font:font}));
		creditButton.on("click",function() {
			Q.audio.play("MenuSelect.mp3");
			Q.stageScene('Credits');
		});
		//insertamos un botón para los controles
		var controlsButton = container.insert(new Q.UI.Button({ x: 0, y: 110, fill: "rgba(0,0,0,0.3)",
						label: "Controles" ,w:w,h:h,font:font}));
		controlsButton.on("click",function() {
			Q.audio.play("MenuSelect.mp3");
			Q.stageScene('Controls');
		});
						
		container.fit(20);
		stage.on("destroy",function() {
			title.destroy();
		});
		//paramos los audios
		Q.audio.stop();
		//ejecutamos el audio principal, que se repita
		Q.audio.play('MusicaMaya.mp3',{ loop: true });		
		//inicializamos los elementos del HUD del juego
		Q.state.reset({actualHearts:3,totalHearts:3,throwBombs:0,bossLive:totalBossLive,showBossLive:0,dialogueText:""});
		
	});
	
//-------ESCENA PANTALLA DE CONTROLES-----------------	
	Q.scene('Controls',function(stage) {
		//Insertamos la imágen de controles
		var title =stage.insert(new Q.Controls({x: Q.width/2, y: Q.height/2}));
		//insertamos un contenedor de elementos en el escenario
		var container = stage.insert(new Q.UI.Container({
								x: 50, y: 25, fill: "rgba(0,0,0,0)"
								}));
        var h=25,font="bold 20px Curiel";								   
		//insertamos un botón para empezar el juego
		var backButton = container.insert(new Q.UI.Button({ x: 0, y: 0, fill: "rgba(192,192,192,1)",
						label: "Volver",h:h,font:font }));
		backButton.on("click",function() {
			Q.stageScene('mainTitle');
		});
		container.fit(20);
		stage.on("destroy",function() {
			title.destroy();
		});		
	});
	
	
//-------ESCENA PANTALLA DE CREDITOS-----------------	
	Q.scene('Credits',function(stage) {
		//Insertamos la imágen de controles
		var title =stage.insert(new Q.Credits({x: Q.width/2, y: Q.height/2}));
		//insertamos un contenedor de elementos en el escenario
		var container = stage.insert(new Q.UI.Container({
								x: 50, y: 25, fill: "rgba(0,0,0,0)"
								}));
        var h=25,font="bold 20px Curiel";								   
		//insertamos un botón para empezar el juego
		var backButton = container.insert(new Q.UI.Button({ x: 0, y: 0, fill: "rgba(192,192,192,1)",
						label: "Volver",h:h,font:font }));
		backButton.on("click",function() {
			if (stage.options.backScene){
				Q.stageScene(stage.options.backScene);
			}else{
				Q.stageScene('mainTitle');
			}
		});
		container.fit(20);
		stage.on("destroy",function() {
			title.destroy();
		});		
	});
	
//-------ESCENA FIN DE JUEGO-----------------	
	Q.scene('endGameTitle',function(stage) {
		//Insertamos el título en la escena
		var title =stage.insert(new Q.EndGameTiled({x: Q.width/2, y: Q.height/2}));
		//insertamos un contenedor de elementos en el escenario
		var container = stage.insert(new Q.UI.Container({
								x: Q.width/2, y: Q.height/2-100, fill: "rgba(0,0,0,0)"
								}));
		var w=220,h=50,font="bold 30px Curiel";	
		//insertamos un botón para ir al menú principal
		var menuButton = container.insert(new Q.UI.Button({ x: 0, y: 55, fill: "rgba(0,0,0,0.3)",
						label: "Men"+'\u00fa'+" principal" ,w:w,h:h,font:font}));
		menuButton.on("click",function(){
			Q.audio.play("MenuSelect.mp3");
			Q.stageScene('mainTitle');
		});
		//insertamos un botón para los créditos
		var creditButton = container.insert(new Q.UI.Button({ x: 0, y: 110, fill: "rgba(0,0,0,0.3)",
						label: "Cr"+'\u00e9'+"ditos" ,w:w,h:h,font:font}));
						
		creditButton.on("click",function() {
			Q.audio.play("MenuSelect.mp3");
			Q.stageScene('Credits',0,{backScene:'endGameTitle'});
		});
						
		container.fit(20);
		actualPlayerLevel="initialHouseLevel";
		canThrowBomb=false;
		hasTalkedMom=false;
		hasTalkedTraveler=false;

		stage.on("destroy",function() {
			title.destroy();
		});
		
	});
	
//-------ESCENA PANTALLA DE INICIO-----------------	
	Q.scene('gameOverTitle',function(stage) {
		Q.audio.stop();
		//Insertamos el título en la escena
		var title =stage.insert(new Q.GameOverTiled({x: Q.width/2, y: Q.height/2}));
		//insertamos un contenedor de elementos en el escenario
		var container = stage.insert(new Q.UI.Container({
								x: Q.width/2, y: Q.height/2+50, fill: "rgba(0,0,0,0)"
								}));
        var w=220,h=50,font="bold 30px Curiel";									   
		//insertamos un botón para empezar el juego
		var playButton = container.insert(new Q.UI.Button({ x: 0, y: 0, fill: "rgba(192,192,192,1)",w:w,h:h,
						label: "Continuar",font:font }));
		playButton.on("click",function() {
			Q.clearStages();
			var fichero = actualPlayerLevel + ".tmx";
			Q.loadTMX(fichero,function(){
				Q.stageScene(actualPlayerLevel);
				//inicializamos los elementos del HUD del juego
				var hearts = Q.state.get("totalHearts");
				Q.state.reset({actualHearts:hearts,totalHearts:hearts,throwBombs:0,bossLive:totalBossLive,showBossLive:0,dialogueText:""});
				Q.stageScene('hud',1);
				if (canThrowBomb)Q.state.set("throwBombs",1);
				if (actualPlayerLevel=="TempleEntranceLevel" || actualPlayerLevel=="VillageTempleLevel") 
					Q.audio.play("MusicaMaya.mp3",{loop:true});
			});
		});	

				//insertamos un botón para ir al menú principal
		var menuButton = container.insert(new Q.UI.Button({ x: 0, y: 55, fill: "rgba(192,192,192,1)",
						label: "Men"+'\u00fa'+" principal" ,w:w,h:h,font:font}));
		menuButton.on("click",function(){
			Q.audio.play("MenuSelect.mp3");
			Q.stageScene('mainTitle');
		});
		container.fit(20);
		stage.on("destroy",function() {
			title.destroy();
		});
		
	});


//-------ESCENA DE DIALOGO-----------------

		Q.scene('dialog',function(stage){
			//obtenemos el diálogo
			var dialogue = getDialogue(stage.options.dialogueName) || stage.options.dialogue;
			var firstDialogue = stage.options.firstDialogue ? stage.options.firstDialogue : false;
			if (firstDialogue){
				Q.clearStage(0);
			}else{
				//pausamos la escena principal
				Q.stage(0).pause();
			}
			//Insertamos el fondo del diálogo
			var dialogueBackground =stage.insert(new Q.DialogueBackground({x: Q.width/2, y: Q.height-55,
												 dialogue:dialogue,name:stage.options.name,firstDialogue:firstDialogue}));
			//insertamos un contenedor de elementos en el escenario
			var container = stage.insert(new Q.UI.Container({
									x: Q.width/2, y: Q.height-60, fill: "rgba(0,0,0,0)"}));
									
			var name= typeof stage.options.name !== "undefined" ? stage.options.name+":" :  "";
			var weight="bold",size="20",family="Curiel";
			var labelName = container.insert(new Q.UI.Text({x:-90, y:-30,color:"white",
									label: name,weight:weight,size:size,family:family}));	
			var y= (name=="") ? -15 : 0;
			var label = container.insert(new Q.UI.Text({x:-5, y:y,color:"white",
									label: dialogue[0],h:40,w:Q.width-50,weight:weight,size:size,family:family}));				
			container.fit(20);
			stage.on("destroy",function() {
				dialogueBackground.destroy();
			});
			Q.state.on("change.dialogueText",this,function(dialogueText){
				label.p.label=dialogueText;			
			});
		})
		

//-------ESCENA HUD-----------------

		Q.scene('hud',function(stage){
			//Insertamos el cuadro de las dagas
			var swordBox =stage.insert(new Q.WeaponBoxHUD({x: Q.width-100, y: 30,sheet:"WeaponSwordBox"}));
			//Insertamos el cuadro de las bombas
			var bombBox =stage.insert(new Q.WeaponBoxHUD({x: Q.width-40, y: 30,sheet:"WeaponBombEmptyBox"}));
			//Insertamos los corazones de vida en un array
			var hearts=[];
			var auxX=20;
			for (var i=0;i<Q.state.get("totalHearts");i++){
				hearts[i]=stage.insert(new Q.HeartHUD({x: auxX+i*27, y: 30,frame:4}));
			}
			
			//insertamos un contenedor para el nombre del demonio
			var containerName,labelName,containerLive,initialWidthLive=200,actualWidthLive=200,actualX=180;
		
			
			Q.state.on("change.actualHearts",this,function(actualHearts){
					//obtenemos el número de corazones totalmente rellenos 
					//y la parte que falta del primer corazón no relleno del todos
					var completeHearts = Math.floor(actualHearts);
					var frame = completeHearts==0 ? actualHearts*4 :(actualHearts % completeHearts)*4;
					//Llenamos los primeros
					for (var i=0; i<completeHearts;i++){
						hearts[i].p.frame=4;
					}
					if (actualHearts!=Q.state.get("totalHearts")){
						//actualizamos el frame del incompleto
						hearts[completeHearts].p.frame=frame;
					}
					//vaciamos el resto
					for (var i=completeHearts+1; i<hearts.length;i++){
						hearts[i].p.frame=0;
					}
					
			});
			
			Q.state.on("change.totalHearts",this,function(totalHearts){
				//añadimos un corazón al HUD
				hearts[totalHearts-1]=Q.stage(1).insert(new Q.HeartHUD({x: auxX+(totalHearts-1)*27, y: 30,frame:4}));	
				Q.state.set("actualHearts",totalHearts);
			});
			
			Q.state.on("change.throwBombs",this,function(throwBombs){
				//añadimos la caja con las bombas
				bombBox.destroy();
				bombBox =Q.stage(1).insert(new Q.WeaponBoxHUD({x: Q.width-40, y: 30,sheet:"WeaponBombBox"}));
				canThrowBomb=true;
			});
			
			Q.state.on("change.showBossLive",this,function(showBossLive){
				//insertamos un contenedor para el nombre del demonio
				 containerName = Q.stage(1).insert(new Q.UI.Container({
										x: 40 ,y: 70, fill: "rgba(0,0,0,0)"}));
				
				labelName = containerName.insert(new Q.UI.Text({x:0, y:0,color:"white",
										label: "Xibalb"+'\u00e1'+":",weight:"bold",size:"20",family:"Curiel"}));	
				//insertamos un contenedor que usaremos como barra de vida
				containerLive = Q.stage(1).insert(new Q.UI.Container({
										x: actualX, y: 70,w:actualWidthLive,h:10, fill: "rgba(0,255,0,1)"}));
			});
			
			Q.state.on("change.bossLive",this,function(bossLive){
				containerLive.destroy();
				var fill= bossLive<=totalBossLive*0.25 ? "rgba(255,0,0,1)" :
						  bossLive<=totalBossLive*0.5  ? "rgba(255,255,0,1)" :
						  "rgba(0,255,0,1)";
				//calculamos la cantidad de barra a mostrar
				var actualPercent= bossLive*100/totalBossLive;
				var w=actualPercent*initialWidthLive/100;
				actualX=actualX-(actualWidthLive-w)/2;
				actualWidthLive=w;
				//insertamos un contenedor que usaremos como barra de vida
				containerLive = Q.stage(1).insert(new Q.UI.Container({
										x: actualX, y: 70,w:actualWidthLive,h:10, fill: fill}));
			});
			
			stage.on("destroy",function() {
				swordBox.destroy();
				bombBox.destroy();
				for (var i=0;i<hearts.length;i++){
					hearts[i].destroy();
				}
			});
		});


	Q.scene('initialDialogue',function(stage) {
		
			Q.stageScene("dialog",2,{dialogueName:"introDialogue",firstDialogue:true});

	});		
		

//-------------------------------------ANIMACIONES----------------------------------------------\\

//--------------PLAYER

	Q.animations('playerAnim', {
		walkU: { frames: [2,0,1], rate:1/10, loop:false},
		walkR: { frames: [6,4,5], rate:1/10, loop:false},
		walkD: { frames: [10,8,9], rate:1/10, loop:false},
		walkL: { frames: [14,12,13], rate:1/10, loop:false},
		standU: { frames: [1]},
		standR: { frames: [5]},
		standD: { frames: [9]},
		standL: { frames: [13]},
		throwU: { frames: [3], rate:1/3,loop:false,trigger:"endThrowing"},
		throwR: { frames: [7], rate:1/3,loop:false,trigger:"endThrowing"},
		throwD: { frames: [11], rate:1/3,loop:false,trigger:"endThrowing"},
		throwL: { frames: [15], rate:1/3,loop:false,trigger:"endThrowing"},
		death: { frames: [0,1,2,3,4], rate:1/5,loop:false,trigger:"die"}
	});
	
//---------------Cuchillo
	Q.animations('KnifeAnim',{
		throwU: { frames: [0]},//verticalKnife
		throwR: { frames: [0]},//horizontalKnife
		throwD: { frames: [1]},//verticalKnife
		throwL: { frames: [2]} //horizontalKnife
	});
	
//---------------Ciudadanos

	Q.animations('villagerAnim',{
		walkD: { frames: [2,0,1], rate:1/10, loop:false},
		walkL: { frames: [5,3,4], rate:1/10, loop:false},
		walkR: { frames: [8,6,7], rate:1/10, loop:false},
		walkU: { frames: [11,9,10], rate:1/10, loop:false}	
	});
	
//---------------Enemigo lanzador

	Q.animations('launcherAnim',{
		walkD: { frames: [6,7], rate:1/8, loop:false},
		walkL: { frames: [0,1], rate:1/8, loop:false},
		walkR: { frames: [2,3], rate:1/8, loop:false},
		walkU: { frames: [4,5], rate:1/8, loop:false}
	});
	
//---------------Bomba

	Q.animations('bombAnim',{
		stand: { frames: [0],rate:1.5,next:'preBurst'},
		preBurst: { frames: [1,2,3,4,5,6,7,8,0,1,2,3,4,5,6,7,8], rate:1/10, loop:false,trigger:"burst"}
	});
	
	Q.animations('bombBurstAnim',{
		burst: { frames: [0,1,2,3,4,5,6,7,8,9,10], rate:1/10, loop:false,trigger:"destroy"},
	});
	
//---------------HECHIZOS

	Q.animations('spellAnim',{
		spellLU: { frames: [0,1,2,3,4,5,6,7],rate:1/10},
		spellRD: { frames: [8,9,10,11,12,13,14,15], rate:1/10}
	});
	
//---------------Hechiceros enemigos

	Q.animations('wizardAnim',{
		walkD: { frames: [2,0,1], rate:1/10, loop:false},
		walkL: { frames: [5,3,4], rate:1/10, loop:false},
		walkR: { frames: [8,6,7], rate:1/10, loop:false},
		walkU: { frames: [11,9,10], rate:1/10, loop:false},
		standD: { frames: [1]},
		standL: { frames: [4]},
		standR: { frames: [7]},
		standU: { frames: [10]}	
	});
	
//---------------MASTER BOSS

	Q.animations('bossAnim',{
		spellLD: { frames: [1,0,2],rate:1/4,loop:false},
		spellRU: { frames: [4,3,5], rate:1/4,loop:false},
		standLD: { frames: [2]},
		standRU: { frames: [5]},
		bigSpell: { frames: [0,1,2,3,4,5], rate:1/5, loop:false,trigger:"throwBigSpell"},
		die: { frames: [0,1,2,3,4,5,6,7,8], rate:1/4, loop:false,trigger:"death"}
	});
	
	
//--------------------------------CARGA DE LOS RECURSOS DEL JUEGO----------------------------------------\\

	
	Q.load(["Player.png","Player.json","Knife.png","Knife.json","Villager5.png","Villager5.json","Monk.json"
			,"Villager3.png","Villager3.json","LauncherEnemy.png","LauncherEnemy.json","LauncherBall.png",
			"InteriorHouseTiles.png","Villager1.png","Villager1.json","Villager2.png","Villager2.json",
			"OutsideTemple.png","InsideTemple.png","DialogueBackground.png","WeaponSwordBox.png",
			,"WeaponBombBox.png","WeaponBombEmptyBox.png","Hearts.png","PlayerDeath.png","PlayerDeath.json",
			"TheEndTitle.png","GameOverTiled.png","PlayerBomb.png","PlayerBombBurst.png","Bomb.json","Controls.png",
			,"BombBurst.json","Villager4.png","Villager4.json","Villager6.png","Villager6.json","Monk.png",
			"Demon1.png","Demon1.json","Demon2.png","Demon2.json","ShadowDemon.png","ShadowDemon.json","MusicaTemploMaya.mp3",
			"FireBallSpell.png","FireBallSpell.json","IceSpell.png","IceSpell.json",,"BossSpell.png","BossSpell.json",
			"InsideHouse.mp3","MusicaTemplo.mp3","MasterDemon.png","MasterDemon.json","Credits.png",
			"BombBurst.mp3","BossBigSpellCharge.mp3","BossDying.mp3","Dialogue.mp3","EarnBombs.mp3",
			"EnemyDying.mp3","EnemyHit.mp3","EnemySpell.mp3","GetHeartPeace.mp3","KnifeThrow.mp3","KnifeWallCollision.mp3",
			"MenuSelect.mp3","PlayerDying.mp3","PlayerHit.mp3","PlayerLowHeart.mp3","MusicaMaya.mp3","MainTitle.png"], function() {
			
			//cargamos los png´s que solo tienen una imagen 
			Q.sheet("mainTitle","MainTitle.png", {tilew: 320, tileh: 480 ,sx: 0,sy: 0});
			Q.sheet("ball","LauncherBall.png", {tilew: 10, tileh: 10 ,sx: 0,sy: 0});
			Q.sheet("endGameTitle","TheEndTitle.png", {tilew: 320, tileh: 480 ,sx: 0,sy: 0});
			Q.sheet("gameOverTitle","GameOverTiled.png", {tilew: 320, tileh: 480 ,sx: 0,sy: 0});
			Q.sheet("dialogueBackground","DialogueBackground.png", {tilew: 300, tileh: 100 ,sx: 0,sy: 0});
			Q.sheet("InteriorHouseTiles","InteriorHouseTiles.png", {tilew: 16, tileh: 16 ,sx: 0,sy: 0});
			Q.sheet("OutsideTemple","OutsideTemple.png", {tilew: 16, tileh: 16 ,sx: 0,sy: 0});
			Q.sheet("InsideTemple","InsideTemple.png", {tilew: 16, tileh: 16 ,sx: 0,sy: 0});
			Q.sheet("WeaponSwordBox","WeaponSwordBox.png", {tilew: 56, tileh: 54 ,sx: 0,sy: 0});
			Q.sheet("WeaponBombBox","WeaponBombBox.png", {tilew: 56, tileh: 54 ,sx: 0,sy: 0});
			Q.sheet("WeaponBombEmptyBox","WeaponBombEmptyBox.png", {tilew: 56, tileh: 54 ,sx: 0,sy: 0});
			Q.sheet("Heart","Hearts.png", {tilew: 23.6, tileh: 22 ,sx: 0,sy: 0});
			Q.sheet("Controls","Controls.png", {tilew: 320, tileh: 480 ,sx: 0,sy: 0});
			Q.sheet("Credits","Credits.png", {tilew: 320, tileh: 480 ,sx: 0,sy: 0});
			
			//Cargamos todos los archivos .png con los sprites, los asociamos a sus json
			Q.compileSheets("Player.png","Player.json");
			Q.compileSheets("Knife.png","Knife.json");
			Q.compileSheets("Villager5.png","Villager5.json");
			Q.compileSheets("Villager3.png","Villager3.json");
			Q.compileSheets("Villager1.png","Villager1.json");
			Q.compileSheets("Villager2.png","Villager2.json");
			Q.compileSheets("Villager4.png","Villager4.json");
			Q.compileSheets("Villager6.png","Villager6.json");
			Q.compileSheets("LauncherEnemy.png","LauncherEnemy.json");
			Q.compileSheets("PlayerDeath.png","PlayerDeath.json");
			Q.compileSheets("PlayerBomb.png","Bomb.json");
			Q.compileSheets("PlayerBombBurst.png","BombBurst.json");
			Q.compileSheets("Demon1.png","Demon1.json");
			Q.compileSheets("Demon2.png","Demon2.json");
			Q.compileSheets("ShadowDemon.png","ShadowDemon.json");
			Q.compileSheets("FireBallSpell.png","FireBallSpell.json");
			Q.compileSheets("IceSpell.png","IceSpell.json");
			Q.compileSheets("MasterDemon.png","MasterDemon.json");
			Q.compileSheets("BossSpell.png","BossSpell.json");
			Q.compileSheets("Monk.png","Monk.json");

			Q.loadTMX("initialHouseLevel.tmx",function(){
						Q.stageScene('mainTitle');	
					});
				
		}
	);	
	
	Q.load([], function() {
			//cargamos los png´s que solo tienen una imagen 
			
			Q.stageScene('mainTitle');		
	});
}//Final de la función a la que llama el load		
);