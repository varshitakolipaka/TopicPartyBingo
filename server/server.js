const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const randomColor = require("randomcolor");
const createBoard = require("./create-board");
const createCooldown = require("./create-cooldown");

const app = express();
var cardcount = {};
var Norow;
var roomIDArr = {};
var TEST, number, status;

app.use(express.static(`${__dirname}/../client`));
user_board = [2, 4, 5];

const server = http.createServer(app);
const io = socketio(server);
const { clear, getBoard, makeTurn } = createBoard(20);


function shuffleArray(array) {
	for (var i = array.length - 1; i > 0; i--) {
		var j = Math.floor(Math.random() * (i + 1));
		var temp = array[i];
		array[i] = array[j];
		array[j] = temp;
	}
}


function addAndSort(arr, val) {
	arr.push(val);
	i = arr.length - 1;
	item = arr[i];
	while (i > 0 && item < arr[i - 1]) {
		arr[i] = arr[i - 1];
		i -= 1;
	}
	arr[i] = item;
	return arr;
}


var isSquare = function (n) {
	return Math.sqrt(n) % 1 === 0;
};


const declareWinner = (array, rows) => {

	//rows
	var arr = array;

	for (var i = 0; i < arr.length; i++) {
		if ((arr[i] + 1) % rows == 1) {
			var k = 0;
			for (var j = 0; j < rows; j++) {
				if (arr.includes(arr[i] + j, i)) {
					k++;
				}
			}

			if (k == rows) {
				console.log("Game Won through rows");
				return 0;
			}
		}
	}

	//column

	var len = arr.length;
	
	for (var rem = 0; rem < rows; rem += 1) {
		
		var count = 0;

		for (var j = 0; j < len; j += 1) {
			
			if ((arr[j] + 1) % rows == rem) {
				count++;
				console.log("inside column");
				console.log(arr[j]);
			}
		}
		if (count == rows) {
			console.log("game win through columns");
			return 1;
		}
	}

	//diagonal 1

	var count = 0;
	for (var j = 0; j < len; j += 1) {

		if (parseInt(arr[j], 10) % (parseInt(rows, 10) + 1) == 0) {

			count++;
		}
	}
	if (count == rows) {
		console.log("won using diagonals 1");
		return 2;
	}

	//diagonal 2
	var count2 = 0;
	for (var j = 0; j < rows; j++) {
		let smol = parseInt(rows) - 1;
		let prod = j * smol;
		let sum = parseInt(rows, 10) + parseInt(prod, 10);
		let final = sum - 1;

		if (arr.includes(final)) {
			count2++;
		}
	}
	if (count2 == rows) {
		console.log("won using diagonals 2");
		return 3;
	}
	return 4;
};


function modifyVotes(vote, roomID) {
	vote = parseInt(vote, 10);
	roomIDArr[roomID]["yes_votes"] += vote;
	roomIDArr[roomID]["total_votes"] += 1;

}


function initVotes(roomID) {
	roomIDArr[roomID]["yes_votes"] = 0;
	roomIDArr[roomID]["total_votes"] = 0;
	message = "Voting round has begun! :)"
	io.to(roomID).emit("message", message);
}


io.sockets.on('connection', function (sock) {

	const cooldown = createCooldown(2000);

	sock.on('newGameCreated', (roomID) => {
		console.log(roomID);
		roomIDArr[roomID] = {};
		(roomIDArr[roomID])["members"] = [];
		(roomIDArr[roomID])["yes_votes"] = 0;
		(roomIDArr[roomID])["total_votes"] = 0;
		(roomIDArr[roomID])["join"] = 1;
	});

	sock.on("joinRoom", function ({ roomID, name }) {
		console.log(roomIDArr);
		if (roomID in roomIDArr && roomIDArr[roomID]["join"] == 1) {
			roomIDArr[roomID]["members"].push(name);
			sock.join(roomID);
			console.log(roomID);
			roomDetails = roomIDArr[roomID]["members"];
			console.log(roomDetails);
			show_message = "Hi " + name + "! Welcome to room: " + roomID + "<br> You can chill in the lobby and chat till we start the game! :)";
			io.to(roomID).emit('mem', roomDetails);
			io.to(roomID).emit("message", show_message);
		}

		else {
			console.log("room closed or does not exist! Please type again!");
			// io.to(roomID).emit("message", show_message);
		}
	});

	sock.on("message", ({ text, name, roomID }) => {
		show_message = name + ": " + text;
		io.to(roomID).emit("message", show_message);
	});
	// sock.emit('begin voting',{roomID})

	sock.on("add vote yes", ({ roomID, name, vote }) => {
		show_message = name + " voted yes.";
		console.log(vote);
		io.to(roomID).emit("message", show_message);
		modifyVotes(vote,roomID);

	});

	sock.on("add vote no", ({ roomID, name, vote }) => {
		show_message = name + " voted no.";
		console.log(vote);
		io.to(roomID).emit("message", show_message);
		modifyVotes(vote,roomID);
	});

	sock.on("begin voting", ({roomID}) => {
		initVotes(roomID);
	});

	sock.on("submitted", ({ row, optionc, name, roomID }) => {
	if(roomID in roomIDArr){

		roomIDArr[roomID]["join"] = 0;
		row = parseInt(row, 10);
		TEST = [...Array(row * row).keys()];
		console.log(row);
		console.log("ARRAY IS:" + TEST);
		shuffleArray(TEST);
		if (TEST.length) {
			number = TEST[TEST.length - 1];
			TEST.pop();
			console.log(number);
			io.to(roomID).emit("nextTurnCard", number);
		} else {
			status = "Game Over!";
			io.to(roomID).emit("message", status);
		}

		io.to(roomID).emit("make empty board", { row, optionc, roomID });
		io.to(roomID).emit("nextTurnCard", number);
		Norow = row;
		console.log(row);
		console.log(optionc);
		console.log(name);
		joined = name + " started the game!";
		cardcount[name] = [];
		console.log(cardcount);
		io.to(roomID).emit("message", joined);
	}
	else{
		console.log("no room exists!");
	}}
	);

	sock.on("turnDone", ({ name, HighlightCardNumber, roomID }) => {
		console.log("here => 2");
		
		joined = name + " chose this card " + HighlightCardNumber;
		addAndSort(cardcount[name], HighlightCardNumber);
		
		let winstat;
		let message = name + " won using ";
		winstat = declareWinner(cardcount[name], Norow);
		switch (winstat) {
			case 0:
				message += "rows";
				io.to(roomID).emit("message", message);
				break;
			case 1:
				message += "columns";
				io.to(roomID).emit("message", message);
				break;
			case 2:
				message += "diagonal primary";
				io.to(roomID).emit("message", message);
				break;
			case 3:
				message += "diagonal non-primary";
				io.to(roomID).emit("message", message);
				break;
			default:
			// io.to(roomID).emit("begin voting")
		}

		
		console.log(cardcount);
		if (TEST.length) {
			number = TEST[TEST.length - 1];
			TEST.pop();
			console.log(number);
			io.to(roomID).emit("nextTurnCard", number);
		} else {
			status = "Game Over!";
			io.to(roomID).emit("message", status);
		}


	});

	sock.on("turn", ({ x, y, roomID }) => {
		if (cooldown()) {
			const playerWon = makeTurn(x, y, color);
			io.to(roomID).emit("turn", { x, y, color });

			if (playerWon) {
				sock.emit("message", "You Won!");
				io.to(roomID).emit("message", "New Round");
				clear();
				io.to(roomID).emit("board");
			}
		}
	});
});


server.on("error", (err) => {
	console.error(err);
});

server.listen(8080, () => {
	console.log("server is ready");
});

var options = [
	{
		name: "school",

		cards: [
			"bunked class",
			"got detention",
			"brought alcohol",
			"eaten in class",
			"skipped homework",
			"gotten hit",
			"suspended",
			"been called dumb",
			"been at the top of class",
			"written on my shirt",
			"lied for my friends",
		],
		type: "default",
	},
];

