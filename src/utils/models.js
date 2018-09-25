import { Firebase, Database } from "./firebase";
import { filter, pipe, toLower, contains, prop, slice } from "ramda";

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
  return Firebase.auth().signInWithEmailAndPassword(email, password);
};

export const extractUserInfo = ({ email, uid }) => ({ email, id: uid });

export const timeout = duration =>
  new Promise(resolve => setTimeout(() => resolve(), duration));

export const isAuthenticated = () => {
  return timeout(1000).then(() => {
    const user = Firebase.auth().currentUser;
    if (user) return createOrUpdateUser(user.uid, extractUserInfo(user));
    return Promise.reject("The user is not connected");
  });
};

const userSchema = data => ({
  username: "",
  lastName: "",
  firstName: "",
  email: "",
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

export const register = ({ username, email, password }) => {
  return Firebase.auth()
    .createUserWithEmailAndPassword(email, password)
    .then(({ user }) => {
      return createOrUpdateUser(user.uid, { id: user.uid, username, email });
    });
};

export const getUsersByName = name => {
  return getDataFromCache("users")
    .then(mapQuerySnapshot)
    .then(filter(pipe(prop("username"), toLower, contains(name))))
    .then(slice(0, 10));
};

export const getChallenges = () => {
  return Database.collection("challenges")
    .where("acceptedAt", ">", new Date("1900-01-01"))
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
