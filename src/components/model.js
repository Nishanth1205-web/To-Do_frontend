import React, { Component } from "react";

export default class CustomModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeItem: this.props.activeItem,
    };
  }

  handleChange = (e) => {
    let { name, value } = e.target;

    if (e.target.type === "checkbox") {
      value = e.target.checked;
    }

    const activeItem = { ...this.state.activeItem, [name]: value };

    this.setState({ activeItem });
  };

  render() {
    const { toggle, onSave } = this.props;

    return (
      <div className="modal d-block" tabIndex="-1" role="dialog">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Todo Item</h5>
              <button type="button" className="close" onClick={toggle}>
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="todo-title">Title</label>
                <input
                  className="form-control"
                  type="text"
                  id="todo-title"
                  name="title"
                  value={this.state.activeItem.title}
                  onChange={this.handleChange}
                  placeholder="Enter Todo Title"
                />
              </div>
              <div className="form-group">
                <label htmlFor="todo-description">Description</label>
                <input
                  className="form-control"
                  type="text"
                  id="todo-description"
                  name="description"
                  value={this.state.activeItem.description}
                  onChange={this.handleChange}
                  placeholder="Enter Todo description"
                />
              </div>
              <div className="form-group form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="todo-completed"
                  name="completed"
                  checked={this.state.activeItem.completed}
                  onChange={this.handleChange}
                />
                <label className="form-check-label" htmlFor="todo-completed">
                  Completed
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-success"
                onClick={() => onSave(this.state.activeItem)}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}