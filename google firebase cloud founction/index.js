//This script is a cloud function script for google firebase and firestore.

//Rank Up Event
 exports.tierUpdateEvent = functions.region('asia-northeast3').firestore.document('Users/{accountID}/Tire').onUpdate((snapshot, context) => {
	functions.logger.log("tierUpdateEvent Rank Up Event => "+snapshot.data().MapName+"의 "+snapshot.data().Name+"님");
	functions.logger.log("MyAccountID=> "+context.params.accountID);
	functions.logger.log("FriendAccountID=> "+context.params.friendAccountID);
	var MyAccountID= context.params.accountID;
	var friendAccountID= context.params.friendAccountID;
 });


//holiday event
exports.weekendNotice = functions.region('asia-northeast3').pubsub.schedule('30 14 * * 0').timeZone('Asia/Seoul').onRun((context) => {
	var time = new Date();
	time.setHours(time.getHours()+9);
	time = admin.firestore.Timestamp.fromDate(time);
	admin.firestore().collection('ServerEvent').add({
		Reward: "MONEY",
		RewardCount: 10000000,
		Main: "On Sundays off Everyone plays hwatu!",
		Deadline: time
	});
	return 0;
});


//Events and rewards for users in the same neighborhood as new users
//When a user living in the same neighborhood logs in for the first time, a notification and event reward to the people in the neighborhood
exports.SameMapUserEvent = functions.region('asia-northeast3').firestore.document('Newbies/{accountID}').onCreate((snapshot, context) => {
	functions.logger.log("SameMapUserEvent new users event => "+snapshot.data().MapName+"의 "+snapshot.data().Name+"님");
	functions.logger.log("MapCode=> "+snapshot.data().MapCode);

	var linetime = new Date();
	linetime.setHours(linetime.getHours()+24);
	var DeadTime = admin.firestore.Timestamp.fromDate(linetime)

	admin.firestore().collection('Users').where('MapCode', '==', snapshot.data().MapCode)
	.get().then(snapshot2 => {
		snapshot2.forEach(doc => {
			if(doc.data().NoticeToken=="" || doc.data().NoticeToken==null || doc.data().AccountID==context.params.accountID){
				functions.logger.log("Token is null or self");
			}else{
				functions.logger.log("same neighborhood user AccountID=> "+doc.data().AccountID);
				functions.logger.log("same neighborhood user NoticeToken=> "+doc.data().NoticeToken);
				//same neighborhood user event
				var message = 
				{	
					notification:
					{    
						title: snapshot.data().MapName+"에 "+snapshot.data().Name+"님이 신규가입했습니다.",
						body: snapshot.data().Name+"님의 신규가입 기념으로 보상이 지급 되었습니다."
					},
					fcmOptions: 
					{
						analyticsLabel: "FriendEvent_label"
					},
					"token" : doc.data().NoticeToken
				};		
				admin.messaging().send(message);

				admin.firestore().collection('Users').doc(doc.data().AccountID+"").collection("Event").add({
					Reward: "MONEY",
					RewardCount: 5000000,
					Main: "by adding a friend "+snapshot.data().Name+"Let's play together!",
					Deadline: DeadTime
				}); 
			}
		});
		return 0;
	});
});


//extra friend reward 5,000,000원
//Whenever a friend is created on the server, an event is sent.
exports.AddFriendEVENT = functions.region('asia-northeast3').firestore.document('Friends/{accountID}/friend/{friendAccountID}').onCreate((snapshot, context) => {
    
    functions.logger.log('friendEVENT');
	functions.logger.log("MyAccountID=> "+context.params.accountID);
	functions.logger.log("FriendAccountID=> "+context.params.friendAccountID);
	var MyAccountID= context.params.accountID;
	var friendAccountID= context.params.friendAccountID;

	//reward offer
	var time = new Date();
	time.setHours(time.getHours()+24);
	var DeadTime = admin.firestore.Timestamp.fromDate(time)
	functions.logger.log('time=> '+time+", DeadTime=> "+DeadTime)

	admin.firestore().collection('Users').doc(MyAccountID+"").collection("Event").add({
		Reward: "MONEY",
		RewardCount: 5000000,
		Main: "친구 추가 이벤트 보상",
		Deadline: DeadTime
	}); 

	//event offer
	admin.firestore().collection('Users').doc(friendAccountID).get().then(snapshot2 => {
		var name = snapshot2.data().Name;
		var MapName = snapshot2.data().MapName;
		//나한테 알림 보내기
		admin.firestore().collection('Users').doc(MyAccountID).get().then(snapshot3 => {
			var token = snapshot3.data().NoticeToken;
			functions.logger.log('token=> '+token);
			//나한테 알림 보내기
			var message = 
			{	
				notification:
				{    
					title: "친구 추가 이벤트 보상 받아가세요~",
					body: MapName+" "+name+"님과 친구 대전 하러가기"
				},
				fcmOptions: 
				{
					analyticsLabel: "AddFriendEVENT_label"
				},
				"token" : token
			};		
			admin.messaging().send(message);
			return 0;
		});
	});
});

//Notify me when an article is posted in the customer center
//This function is a function that notifies me when I receive a customer inquiry.
exports.chattingNotice = functions.region('asia-northeast3').firestore.document('ChatQuestion/{accountID}/chat_value/{puskey}').onCreate((snapshot, context) => {
    
    functions.logger.log('chattingNotice start');
	functions.logger.log("문의 고객 accountID=> "+context.params.accountID);
	functions.logger.log("puskey=> "+context.params.puskey);
    var accountID = context.params.accountID;
	var playerValue = snapshot.data().player;
	var timeValue = snapshot.data().time;
	var msg = snapshot.data().msg;
    functions.logger.log('chatting의 accountID=> '+accountID+", playerValue=> "+playerValue+", timeValue=> "+timeValue);
	var token;

	if(playerValue == 1){
		return 0;
	}

	admin.firestore().collection('NewChatting').doc(accountID+"").set({time: timeValue});

	admin.firestore().collection('Users').doc("adminGodGodSB").get().then(snapshot2 => {
		token = snapshot2.data().NoticeToken;
		functions.logger.log('token=> '+token);
		//나한테 알림 보내기
		var message = 
		{	
			notification:
			{    
				title: accountID+"님이 문의(테스트 가로)",
				body: "문의내용=> "+msg
			},
			fcmOptions: 
			{
				analyticsLabel: "chattingNotice_label"
			},
			"token" : token
		};		
		admin.messaging().send(message);
		return 0;
	});
});

//It works when the user provides useful help through an error inquiry.
//Get the data in the reward document, read it, reward the user according to the value, and then delete the existing data.
exports.giftfuntion = functions.region('asia-northeast3').firestore.document('UserGift/{giftText}').onCreate((snapshot, context) => {
	//Users
	console.log("send=> "+snapshot.data().send)
	if(snapshot.data().send!="0"){
		console.log("send가 0이 아님")
		return 0;
	}
	console.log("reward=> "+snapshot.data().reward)//MONEY,KEY
	console.log("count=> "+snapshot.data().count)
	console.log("text=> "+snapshot.data().text)
	console.log("id=> "+snapshot.data().id)

	//보상 제공 
	var time = new Date();
	time.setHours(time.getHours()+24);
	var DeadTime = admin.firestore.Timestamp.fromDate(time)
	functions.logger.log('time=> '+time+", DeadTime=> "+DeadTime)

	admin.firestore().collection('Users').doc(snapshot.data().id+"").collection("Event").add({
		Reward: snapshot.data().reward+"",
		RewardCount: snapshot.data().count+"",
		Main: snapshot.data().text+"",
		Deadline: DeadTime
	}); 
	functions.logger.log('giftfuntion')
	return 0;
});

//schedule('0 0 1 * *') Runs at 00:00 on the 1st of every month
//For monthly ranking counting, ranking data is extracted and put into the ranking collection.
//Get monthly rankings exports.monthlyRanking = functions.pubsub.schedule('0 0 1 * *').onRun((context) => {
exports.getMonthlyRanking = functions.region('asia-northeast3').pubsub.schedule('0 0 1 * *').timeZone('Asia/Seoul').onRun((context) => {
	admin.firestore().collection("Users").orderBy('MonthMoney','desc').limit(10)
	.get().then(snapshot2 => { 
		//1. 현재 시간
		const curr = new Date();
		functions.logger.log('curr=> '+curr)

		//1. UTC 시간 계산
		const utc = 
		curr.getTime() + 
		(curr.getTimezoneOffset() * 60 * 1000);

		//2. UTC to KST (UTC + 9시간)
		const KR_TIME_DIFF = 9 * 60 * 60 * 1000;

		var Rankings = 0;
		var full = new Date(utc + (KR_TIME_DIFF));
		var year = full.getFullYear();// 년도
		var month = full.getMonth() + 1;// 월
		if(month<10){
			month='0'+month;
		}
		var date = full.getDate();//일자
		if(date<10){
			date='0'+date;
		}
		var time = (year+''+month+''+date)
		functions.logger.log('time=> '+time)
		functions.logger.log('snapshot.size=> '+snapshot2.size)
		//랭킹데이터에 저장
		snapshot2.forEach(doc => {
			Rankings += 1;
			const data =
			{
				accountID: doc.id,
				monthMoney: doc.data().MonthMoney,
				name: doc.data().Name,
				map_code: doc.data().MapCode,
				map_name: doc.data().TopMapName+" "+doc.data().MapName
			};
			admin.firestore().collection('monthlyRanking').doc(time+"").collection('RankingResult').doc(Rankings+"").set(data);
			functions.logger.log('monthlyRanking get/ '+Rankings+'등 '+doc.data().Name+'님 '+doc.data().MonthMoney+'원');
		});
	});
});

//schedule('0 0 * * *') Run at 00:00 every day
//For daily ranking counting, daily ranking data is extracted and put into the ranking collection.
//일일 수익 랭킹 가져오기 exports.dailyRanking = functions.pubsub.schedule('0 0 * * *').onRun((context) => {
exports.getDailyRanking = functions.region('asia-northeast3').pubsub.schedule('0 0 * * *').timeZone('Asia/Seoul').onRun((context) => {
	admin.firestore().collection("Users").orderBy('DayMoney','desc').limit(10)
	.get().then(snapshot2 => {
		//1. 현재 시간
		const curr = new Date();
		functions.logger.log('curr=> '+curr)

		//1. UTC 시간 계산
		const utc = 
		curr.getTime() + 
		(curr.getTimezoneOffset() * 60 * 1000);

		//2. UTC to KST (UTC + 9시간)
		const KR_TIME_DIFF = 9 * 60 * 60 * 1000;

		var Rankings = 0;
		var full = new Date(utc + (KR_TIME_DIFF));
		var year = full.getFullYear();// 년도
		var month = full.getMonth() + 1;// 월
		if(month<10){
			month='0'+month;
		}
		var date = full.getDate();//일자
		if(date<10){
			date='0'+date;
		}
		var time = (year+''+month+''+date)
		functions.logger.log('time=> '+time)
		functions.logger.log('snapshot2.size=> '+snapshot2.size)
		//랭킹데이터에 저장
		snapshot2.forEach(doc => {
			Rankings += 1;
			const data =
			{
				accountID: doc.id,
				dayMoney: doc.data().DayMoney,
				name: doc.data().Name,
				map_code: doc.data().MapCode,
				map_name: doc.data().TopMapName+" "+doc.data().MapName
			};
			admin.firestore().collection('dailyRanking').doc(time+"").collection('RankingResult').doc(Rankings+"").set(data);
			functions.logger.log('dailyRanking get/ '+Rankings+'등 '+doc.data().Name+'님 '+doc.data().DayMoney+'원');
		});
		return 0;
	});
});

//한달 랭킹 보상
exports.MonthlyRankingGift = functions.region('asia-northeast3').pubsub.schedule('0 6 1 * *').timeZone('Asia/Seoul').onRun((context) => {
	var count;
	const curr = new Date();
	functions.logger.log('curr=> '+curr)

	const utc = curr.getTime() + (curr.getTimezoneOffset() * 60 * 1000);
	const KR_TIME_DIFF = 9 * 60 * 60 * 1000;
	var full = new Date(utc + (KR_TIME_DIFF));
	// 년
	var year = full.getFullYear();// 년도
	// 월
	var month = full.getMonth() + 1;// 월
	if(month<10){
		month='0'+month;
	}
	// 일
	var date = full.getDate();//일자
	if(date<10){
		date='0'+date;
	}
	var textTime = (year+''+month+''+date)
	functions.logger.log('textTime=> '+textTime);

	curr.setHours(curr.getHours()+48);
	var DeadTime = admin.firestore.Timestamp.fromDate(curr);
	
	var giftTime = new Date(utc + (KR_TIME_DIFF));
	giftTime.setDate(giftTime.getDate()-2);
	functions.logger.log('getMonth=> '+giftTime.getMonth()+1);

	admin.firestore().collection('monthlyRanking').doc(textTime)
	.collection('RankingResult').orderBy('monthMoney','desc')
	.get().then(snapshot => {
		snapshot.forEach(doc => {
			functions.logger.log('MonthlyRankingGift '+doc.id+'등 andKey=> '+doc.data().accountID+' '+doc.data().name+'님')
			if(doc.id == 1){
				count = 30;
			}else if(doc.id == 2){
				count = 20;
			}else if(doc.id == 3){
				count = 10;
			}else if(doc.id == 4){
				count = 5;
			}else if(doc.id == 5){
				count = 2;
			}else{
				count = 1;
			}

			admin.firestore().collection('Users').doc(snapshot.data().accountID+"").collection("Event").add({
				Reward: "KEY",
				RewardCount: count+"",
				Main: doc.data().name+"님 "+(giftTime.getMonth() + 1)+"월 수익 랭킹 "+doc.id+"등 보상이 도착했습니다!",
				Deadline: DeadTime
			}); 
			
		});
	});
	return 0;
});

//하루 랭킹 보상
exports.dayRankingGift = functions.region('asia-northeast3').pubsub.schedule('0 7 * * *').timeZone('Asia/Seoul').onRun((context) => {
	var count;
	const curr = new Date();
	functions.logger.log('curr=> '+curr)

	const utc = curr.getTime() + (curr.getTimezoneOffset() * 60 * 1000);
	const KR_TIME_DIFF = 9 * 60 * 60 * 1000;
	var full = new Date(utc + (KR_TIME_DIFF));
	// 년
	var year = full.getFullYear();// 년도
	// 월
	var month = full.getMonth() + 1;// 월
	if(month<10){
		month='0'+month;
	}
	// 일
	var date = full.getDate();//일자
	if(date<10){
		date='0'+date;
	}
	var textTime = (year+''+month+''+date)
	functions.logger.log('textTime=> '+textTime);

	curr.setHours(curr.getHours()+17);
	var DeadTime = admin.firestore.Timestamp.fromDate(curr);

	var giftTime = new Date(utc + (KR_TIME_DIFF));
	giftTime.setDate(giftTime.getDate()-1);
	var giftDate = giftTime.getDate();
	functions.logger.log('giftDate=> '+giftDate);

	admin.firestore().collection('dailyRanking').doc(textTime)
	.collection('RankingResult').orderBy('dayMoney','desc').limit(3)
	.get().then(snapshot => {
		snapshot.forEach(doc => {
			functions.logger.log('dayRankingGift '+doc.id+'등 andKey=> '+doc.data().accountID+' '+doc.data().name+'님')
			if(doc.id == 1){
				count = 2;
			}else if(doc.id == 2){
				count = 1;
			}else{
				count = 1;
			}

			admin.firestore().collection('Users').doc(snapshot.data().accountID+"").collection("Event").add({
				Reward: "KEY",
				RewardCount: count+"",
				Main: doc.data().name+"님 "+(giftTime.getMonth() + 1)+"월 "+giftDate+"일 수익 랭킹 "+doc.id+"등 보상이 도착했습니다!",
				Deadline: DeadTime
			}); 
			
		});
	});
	return 0;
});

//한달 멀티 랭킹 초기화
exports.oldMonthMoneyRankingDelete = functions.region('asia-northeast3').pubsub.schedule('30,50 0-4 1 * *').timeZone('Asia/Seoul').onRun((context) => {
	const curr = new Date();
	const utc = curr.getTime() + (curr.getTimezoneOffset() * 60 * 1000);
	const KR_TIME_DIFF = 9 * 60 * 60 * 1000;
	
	var endtime = new Date(utc + (KR_TIME_DIFF));//timestamp 생성
	endtime.setDate(1);
	endtime.setHours(0);
	endtime.setMinutes(0);
	endtime.setSeconds(0);
	endtime = admin.firestore.Timestamp.fromDate(endtime);
	functions.logger.log('oldMonthMoneyRankingDelete endtime=> '+endtime)

	const data =
	{
		MonthMoney: 0,
		DayMoney: 0
	};

	//.startAt(endtime).where('Multi_Month_score', '!=', 0)
	admin.firestore().collection('/Users').orderBy('MonthMoney','desc').limit(100)//.where('time', '<', endtime)
	.get().then(snapshot2 => {
		snapshot2.forEach(doc => {
			if(endtime > doc.data().Login){
				functions.logger.log('지난달 데이터 time=> '+doc.data().Login+'시간, '+doc.data().Name+'님, '+doc.data().MonthMoney+'승');
				//데이터 초기화
				admin.firestore().collection('Users').doc(doc.id).set(data,{ merge: true });
			}else{
				functions.logger.log('최신 데이터 time=> '+doc.data().Login+'시간, '+doc.data().Name+'님, '+doc.data().MonthMoney+'승');
			}
		});
	});
	return 0;
});

//일일 수익 랭킹 초기화 하루전데이터 삭제
exports.oldDayMoneyRankingDelete = functions.region('asia-northeast3').pubsub.schedule('30 9-11 * * *').timeZone('Asia/Seoul').onRun((context) => {
	const curr = new Date();
	const utc = curr.getTime() + (curr.getTimezoneOffset() * 60 * 1000);
	const KR_TIME_DIFF = 9 * 60 * 60 * 1000;
	
	var monthtime = new Date(utc + (KR_TIME_DIFF));//timestamp 생성
	monthtime.setDate(1);
	monthtime.setHours(0);
	monthtime.setMinutes(0);
	monthtime.setSeconds(0);
	var monthtime2 = admin.firestore.Timestamp.fromDate(monthtime);
	functions.logger.log('oldDayMoneyRankingDelete monthtime=> '+monthtime2)

	var daytime = new Date(utc + (KR_TIME_DIFF));//timestamp 생성
	daytime.setHours(0);
	daytime.setMinutes(0);
	daytime.setSeconds(0);
	var daytime2 = admin.firestore.Timestamp.fromDate(daytime);
	functions.logger.log('oldDayMoneyRankingDelete daytime=> '+daytime2)

	const data =
	{
		DayMoney: 0
	};

	//.startAt(endtime).where('Multi_Month_score', '!=', 0)
	admin.firestore().collection('/Users').orderBy('DayMoney','desc').limit(100)//.where('time', '<', endtime)
	.get().then(snapshot2 => {
		snapshot2.forEach(doc => {
			if(daytime2 > doc.data().Login && doc.data().Login > monthtime2){
				if(daytime.getDate() != monthtime.getDate()){
					functions.logger.log('하루 지난 이번달 데이터 time=> '+doc.data().Login+'시간, '+doc.data().Name+'님, '+doc.data().DayMoney+'점');
					admin.firestore().collection('Users').doc(doc.id).set(data,{ merge: true });
				}
			}else{
				functions.logger.log('최신 데이터 time=> '+doc.data().Login+'시간, '+doc.data().Name+'님, '+doc.data().DayMoney+'점')
			}
		});
	});
	return 0;
});


exports.MatchingFunction = functions.region('asia-northeast3').firestore.document('MatchingRoom/{Id}').onCreate(async (snap, context) => 
{
	//매칭을 신청하면 매칭룸에 id를 가져온다.
	const hostValue = snap.data();
	
	var key = hostValue.key;
	
	var roomID = hostValue.roomID;
		
	var bonus_card_count = hostValue.bonus_card;
	var per_point_money = hostValue.per_point_money;
	
	//신청한 유저의 데이터를 가져옴
	var host_id = hostValue.accountID;
	var host_name = hostValue.name;
	var host_rating = hostValue.rating;
	var host_map = hostValue.map;
	var host_tier = hostValue.tier;
	var host_old = hostValue.old;
	var host_gender = hostValue.gender;
	var host_money = hostValue.money;
	
	var target = hostValue.target;
	try{
	var target_num = parseInt(target);
	}
	catch(e)
	{
		console.log("parseInt error " + target + "-" + e);
	}
	
	//호스트가 설정한 배팅금액 보다 높은 등급의 유저를 가져옴
	await admin.firestore().collection('OnlineUser').where('score', '>', per_point_money).orderBy('score', 'asc').limit(1).get().then(snapshot => 
	{
		//온라인 유저중 스코어가 0이상 가장 높은 값을 갖고 있는 유저 1명을 가져옴
		if(snapshot.empty)
		{
			//신청할 사람이 없음
			functions.logger.log('MatchingFunction not Exist')
			return admin.firestore().collection('OnlineUser').doc(host_id).set({status: 5}, { merge: true });
		}
		else
		{		
			//게스트의 스코어가 0이 아니면 신청
			snapshot.forEach(doc => 
			{
				//호스트에게 사람을 찾았다고 보냄
				admin.firestore().collection('OnlineUser').doc(host_id).set({status: 4}, {merge: true});

				functions.logger.log('doc.id: ' + doc.id);
				const data = 
				{
					score: null,
					status: 1 + '/' + key + '/' + 1 + '/' + roomID + '/' + bonus_card_count + '/' + per_point_money + 
					'/' + host_id + '/' + host_name + '/' + host_rating + '/'  + host_map + '/'  + host_tier + '/' + host_old + '/' + host_gender + '/' + host_money
				};
				return admin.firestore().collection('OnlineUser').doc(doc.id).set(data, { merge: true }); 
			});	
			return 0;			
		}
	}).catch(error =>
	{
		functions.logger.log('MatchingFunction error: ' + error)
		throw admin.firestore().collection('OnlineUser').doc(host_id).set({status: 5}, { merge: true });
	});	
	admin.firestore().collection('MatchingRoom').doc(snap.id).delete();
	functions.logger.log('MatchingFunction END');
});



















