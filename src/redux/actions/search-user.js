import * as types from "../constants/search-user";
import * as Models from "./../../utils/models";

export const storeUsers = users => ({
  type: types.storeUsers,
  payload: { users }
});

export const changeValue = value => ({
  type: types.changeValue,
  payload: { value }
});

export const fetching = () => ({
  type: types.fetching
});

export const fetchEnd = () => ({
  type: types.fetchEnd
});

export const fetchSearchUser = value => (dispatcher, getState) => {
  dispatcher(fetching());
  dispatcher(changeValue(value));

  const { auth } = getState();

  return Models.getUsersByName(auth.user.id, value).then(users => {
    dispatcher(fetchEnd());
    dispatcher(storeUsers(users));
  });
};
