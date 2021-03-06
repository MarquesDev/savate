import { Firebase, Database } from "./firebase";
import moment from "moment";
import {
  filter,
  pipe,
  toLower,
  contains,
  prop,
  slice,
  flatten,
  reduce,
  reject,
  uniqBy,
  propEq
} from "ramda";

export const initializeCache = func => {
  const cache = {};
  return func(cache);
};

export const mapQuerySnapshot = querySnapshot => {
  const data = [];

  querySnapshot.forEach(doc => data.push(doc.data()));

  return data;
};

export const getDataFromCache = initializeCache(cache => {
  return collection => {
    if (cache.hasOwnProperty(collection))
      return Promise.resolve(cache[collection]);
    return Database.collection(collection)
      .get()
      .then(doc => {
        cache[collection] = doc;
        return doc;
      });
  };
});

export const authenticate = (email, password) => {
  return Firebase.auth()
    .signInWithEmailAndPassword(email, password)
    .then(isAuthenticated);
};

export const logout = () => {
  return Firebase.auth().signOut();
};

export const forgotPassword = email => {
  return Firebase.auth().sendPasswordResetEmail(email);
};

export const extractUserInfo = ({ uid }) => ({ id: uid });

export const isAuthenticated = () => {
  return new Promise((resolve, reject) => {
    Firebase.auth().onAuthStateChanged(function(user) {
      if (user)
        return resolve(
          createOrUpdateUser(user.uid, extractUserInfo(user)).then(u => ({
            ...u,
            email: user.email
          }))
        );
      return reject("The user is not connected");
    });
  });
};

const userSchema = data => ({
  username: "",
  lastName: "",
  firstName: "",
  character: "",
  ranking: 500,
  ...data
});

const challengeSchema = data => ({
  challenger: {},
  user: {},
  acceptedAt: null,
  deletedAt: null,
  createdAt: null,
  firstTo: null,
  rounds: [],
  id: null,
  ...data
});

export const getUserInfo = id => {
  return Database.collection("users")
    .doc(id)
    .get()
    .then(ref => {
      if (ref.exists) return ref.data();
      return Promise.reject("The user does not exist");
    });
};

export const createOrUpdateUser = (id, data) => {
  return getUserInfo(id)
    .then(info => {
      return Database.collection("users")
        .doc(id)
        .update(userSchema({ ...info, ...data, id }))
        .then(() => userSchema({ ...info, ...data, id }));
    })
    .catch(e => {
      return Database.collection("users")
        .doc(id)
        .set(userSchema({ ...data, id }))
        .then(() => userSchema({ ...data, id }));
    });
};

export const register = ({ username, email, password, character }) => {
  return checkUserAlreadyExist(username).then(user => {
    if (user) return Promise.reject({ code: "auth/user-exist" });

    return Firebase.auth()
      .createUserWithEmailAndPassword(email, password)
      .then(({ user }) => {
        return createOrUpdateUser(user.uid, {
          id: user.uid,
          username,
          character
        });
      })
      .then(user => ({ ...user, email }));
  });
};

export const getUsersByName = (userId, name = "") => {
  return getDataFromCache("users")
    .then(mapQuerySnapshot)
    .then(reject(propEq("id", userId)))
    .then(filter(pipe(prop("username"), toLower, contains(toLower(name)))))
    .then(slice(0, 10));
};

export const checkUserAlreadyExist = value => {
  return Database.collection("users")
    .where("username", "==", value)
    .get()
    .then(e => !e.empty);
};

export const getAllUsers = () => {
  return getDataFromCache("users").then(mapQuerySnapshot);
};

export const listenForChallenges = (userId, callback) => {
  return Database.collection("challenges")
    .where("challenger.id", "==", userId)
    .where("acceptedAt", "==", null)
    .where("deletedAt", "==", null)
    .where("createdAt", ">", new Date())
    .onSnapshot(snapshot => {
      snapshot.docChanges().forEach(e => callback(e.doc.data()));
    });
};

export const getChallenges = () => {
  return Database.collection("challenges")
    .where("acceptedAt", ">", new Date("1900-01-01"))
    .where("deletedAt", "==", null)
    .orderBy("acceptedAt", "desc")
    .get()
    .then(mapQuerySnapshot);
};

export const getHistoryChallenges = () => {
  const day = moment()
    .subtract(1, "day")
    .format();

  return Database.collection("challenges")
    .where("acceptedAt", "<=", new Date(day))
    .where("deletedAt", "==", null)
    .orderBy("acceptedAt", "desc")
    .get()
    .then(mapQuerySnapshot);
};

export const getChallenge = id => {
  return Database.collection("challenges")
    .doc(id)
    .get()
    .then(e => e.data());
};

export const updateUserInfo = (userId, label, value) => {
  return Database.collection("users")
    .doc(userId)
    .update({ [label]: value });
};

export const submitChallenge = schema => {
  const id = Database.collection("challenges").doc();
  return id.set(challengeSchema({ ...schema, id: id.id })).then(() => {
    return challengeSchema({ ...schema, id: id.id });
  });
};

export const getChallengesNotifications = userId => {
  return Database.collection("challenges")
    .where("challenger.id", "==", userId)
    .where("deletedAt", "==", null)
    .where("acceptedAt", "==", null)
    .get()
    .then(mapQuerySnapshot);
};

export const acceptChallenge = challengeId => {
  const date = new Date();
  return Database.collection("challenges")
    .doc(challengeId)
    .update({ acceptedAt: new Date() })
    .then(() => ({ acceptedAt: +date }));
};

export const declineChallenge = challengeId => {
  const date = new Date();
  return Database.collection("challenges")
    .doc(challengeId)
    .update({ deletedAt: new Date() })
    .then(() => ({ deletedAt: +date }));
};

export const or = collections => {
  const queries = collections.map(collection => {
    return collection.get().then(mapQuerySnapshot);
  });

  return Promise.all(queries).then(flatten);
};

const findUser = userId => challenge => {
  const select =
    challenge.user.id === userId ? challenge.user : challenge.challenger;

  return {
    winner: select.winner,
    score: select.score
  };
};

const countWins = userId =>
  reduce((accumulator, challenge) => {
    if (findUser(userId)(challenge).winner) return accumulator + 1;
    return accumulator;
  }, 0);

const countRounds = reduce((accumulator, challenge) => {
  return accumulator + challenge.rounds.length;
}, 0);

const countRoundsWin = userId =>
  reduce((accumulator, challenge) => {
    return findUser(userId)(challenge).score + accumulator;
  }, 0);

export const stats = userId => challenges => {
  const totalChallenge = challenges.length;
  const totalChallengeWin = countWins(userId)(challenges);
  const totalChallengeLoose = totalChallenge - totalChallengeWin;
  const totalRounds = countRounds(challenges);
  const totalRoundsWin = countRoundsWin(userId)(challenges);
  const totalRoundLoose = totalRounds - totalRoundsWin;

  return {
    challenges,
    totalChallenge,
    totalChallengeWin,
    totalChallengeLoose,
    totalRounds,
    totalRoundsWin,
    totalRoundLoose
  };
};

export const getStatsFromUser = userId => {
  const collection = Database.collection("challenges")
    .where("acceptedAt", ">", new Date("1900-01-01"))
    .where("deletedAt", "==", null);

  return or([
    collection.where("user.id", "==", userId),
    collection.where("challenger.id", "==", userId)
  ]).then(stats(userId));
};

export const getStatsFromVersus = (userId, challengerId) => {
  const collection = Database.collection("challenges")
    .where("acceptedAt", ">", new Date("1900-01-01"))
    .where("deletedAt", "==", null);

  return or([
    collection
      .where("user.id", "==", userId)
      .where("challenger.id", "==", challengerId),
    collection
      .where("user.id", "==", userId)
      .where("challenger.id", "==", challengerId)
  ]).then(challenges => {
    const uniq = uniqBy(e => e.id)(challenges);
    return stats(userId)(uniq);
  });
};
