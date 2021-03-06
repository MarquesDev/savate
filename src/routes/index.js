import React from "react";
import Style from "./main.scss";
import { Provider } from "react-redux";
import { BrowserRouter as Router, Route } from "react-router-dom";
import { MuiThemeProvider } from "@material-ui/core/styles";
import { ConnectedRouter } from "connected-react-router";

import theme from "./../styles/mui";
import createStore from "./../redux/stores";
import PageChallenges from "./../components/PageChallenges/PageChallenges";
import Snack from "./../components/Snack/Snack";
import PageChallenge from "./../components/PageChallenge/PageChallenge";
import PageRanking from "./../components/PageRanking/PageRanking";
import PageUser from "./../components/PageUser/PageUser";
import Profile from "./../components/Profile/Profile";
import Body from "./../components/Body/Body";
import Notifications from "./../components/Notifications/Notifications";
import Login from "./../components/Login/Login";
import NavBar from "./../components/NavBar/NavBar";

const store = createStore();

export default (
  <Router>
    <MuiThemeProvider theme={theme}>
      <Provider store={store}>
        <Body>
          <ConnectedRouter history={store.history}>
            <div className={Style.main}>
              <Route exact path="/" component={PageChallenges} />
              <Route exact path="/challenge" component={PageChallenges} />
              <Route exact path="/challenge/:id" component={PageChallenge} />
              <Route exact path="/notifications" component={Notifications} />
              <Route exact path="/profile" component={Profile} />
              <Route exact path="/profile/:id" component={PageUser} />
              <Route exact path="/ranking" component={PageRanking} />
              <Route exact path="/login" component={Login} />
              <NavBar />
              <Snack />
            </div>
          </ConnectedRouter>
        </Body>
      </Provider>
    </MuiThemeProvider>
  </Router>
);
