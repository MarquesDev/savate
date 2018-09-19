import React, { PureComponent } from "react";
import PropTypes from "prop-types";
import Style from "./Footer.scss";

export default class Footer extends PureComponent {
  render() {
    return (
      <div className={Style.container}>
        <div className={Style.button}>Retour</div>
        <div className={Style.button}>Créer un compte</div>
      </div>
    );
  }
}

Footer.propTypes = {};
