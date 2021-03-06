import { connect } from "react-redux";
import actions from "./../../../../../redux/actions";

const mapState = state => ({
  users: state.ranking.world
});

const mapDispatch = dispatch => ({
  onMount: () => dispatch(actions.ranking.fetchWorld()),
  onClickUser: id => dispatch(actions.router.push(`/profile/${id}`))
});

export default connect(mapState, mapDispatch);
