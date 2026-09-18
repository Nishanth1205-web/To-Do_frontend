import React, { Component } from "react";
import CustomModal from "./components/model";
import axios from "axios";
import "./App.css";

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      viewCompleted: false,
      todoList: [],
      modal: false,
      activeItem: {
        title: "",
        description: "",
        completed: false,
      },
      past: [],
      future: [],
    };
  }

  componentDidMount() {
    this.refreshList();
  }

  refreshList = () => {
    axios
      .get("/api/todos/")
      .then((res) => this.setState({ todoList: res.data }))
      .catch((err) => console.log(err));
  };

  recordAction = (action) => {
    this.setState((state) => ({
      past: [...state.past, action],
      future: [],
    }));
  };

  runAction = (action, direction) => {
    const item = direction === "undo" ? action.before : action.after;
    const method = action.type === "create" ? "post" : "put";
    const url = action.type === "create"
      ? "/api/todos/"
      : `/api/todos/${item.id}/`;

    if (action.type === "delete" && direction === "undo") {
      return axios.post("/api/todos/", action.before);
    }

    if (action.type === "delete" && direction === "redo") {
      return axios.delete(`/api/todos/${action.before.id}/`);
    }

    if (action.type === "create" && direction === "undo") {
      return axios.delete(`/api/todos/${action.after.id}/`);
    }

    return axios[method](url, item);
  };

  undo = () => {
    const action = this.state.past[this.state.past.length - 1];
    if (!action) return;

    this.runAction(action, "undo")
      .then((response) => {
        if (action.type === "delete" && response.data) {
          action.before = response.data;
        }
        this.setState((state) => ({
          past: state.past.slice(0, -1),
          future: [...state.future, action],
        }));
        this.refreshList();
      })
      .catch((error) => console.error("Could not undo action", error));
  };

  redo = () => {
    const action = this.state.future[this.state.future.length - 1];
    if (!action) return;

    this.runAction(action, "redo")
      .then((response) => {
        if (action.type === "create" && response.data) {
          action.after = response.data;
        }
        this.setState((state) => ({
          future: state.future.slice(0, -1),
          past: [...state.past, action],
        }));
        this.refreshList();
      })
      .catch((error) => console.error("Could not redo action", error));
  };

  toggle = () => {
    this.setState({ modal: !this.state.modal });
  };

handleSubmit = (item) => {
    this.toggle();

    if (item.id) {
      const previousItem = this.state.todoList.find((todo) => todo.id === item.id);
      axios
        .put(`/api/todos/${item.id}/`, item)
        .then((res) => {
          this.recordAction({ type: "update", before: previousItem, after: res.data });
          this.setState((prevState) => ({
            todoList: prevState.todoList.map((todo) =>
              todo.id === res.data.id ? res.data : todo
            ),
          }));
        })
        .catch((error) => console.error("Could not update todo", error));
      return;
    }

    axios
      .post("/api/todos/", item)
      .then((res) => {
        this.recordAction({ type: "create", before: null, after: res.data });
        this.setState((prevState) => ({
          todoList: [...prevState.todoList, res.data],
          viewCompleted: false,
        }));
      })
      .catch((error) => console.error("Could not create todo", error));
  };

  handleDelete = (item) => {
    axios
      .delete(`/api/todos/${item.id}/`)
      .then(() => {
        this.recordAction({ type: "delete", before: item, after: null });
        this.refreshList();
      })
      .catch((error) => console.error("Could not delete todo", error));
  };

  createItem = () => {
    const item = { title: "", description: "", completed: false };

    this.setState({ activeItem: item, modal: !this.state.modal });
  };

  editItem = (item) => {
    this.setState({ activeItem: item, modal: !this.state.modal });
  };

  displayCompleted = (status) => {
    if (status) {
      return this.setState({ viewCompleted: true });
    }

    return this.setState({ viewCompleted: false });
  };

  renderTabList = () => {
    return (
      <div className="nav nav-tabs">
        <span
          className={this.state.viewCompleted ? "nav-link active" : "nav-link"}
          onClick={() => this.displayCompleted(true)}
        >
          Complete
        </span>
        <span
          className={this.state.viewCompleted ? "nav-link" : "nav-link active"}
          onClick={() => this.displayCompleted(false)}
        >
          Incomplete
        </span>
      </div>
    );
  };

  renderItems = () => {
    const { viewCompleted } = this.state;
    const newItems = this.state.todoList.filter(
      (item) => item.completed === viewCompleted
    );

    return newItems.map((item) => (
      <li
        key={item.id}
        className="list-group-item d-flex justify-content-between align-items-center"
      >
        <span
          className={`todo-title mr-2 ${
            this.state.viewCompleted ? "completed-todo" : ""
          }`}
          title={item.description}
        >
          {item.title}
        </span>
        <span>
          <button
            className="btn btn-secondary mr-2"
            onClick={() => this.editItem(item)}
          >
            Edit
          </button>
          <button
            className="btn btn-danger"
            onClick={() => this.handleDelete(item)}
          >
            Delete
          </button>
        </span>
      </li>
    ));
  };

  render() {
    return (
      <main className="container todo-page">
        <div className="row">
          <div className="col-md-8 col-lg-9 mx-auto p-0">
            <div className="card todo-card p-3">
              <div className="todo-toolbar mb-4">
                <button
                  className="btn btn-primary"
                  onClick={this.createItem}
                >
                  Add task
                </button>
                <div className="history-buttons">
                  <button
                    className="btn btn-outline-secondary"
                    onClick={this.undo}
                    disabled={this.state.past.length === 0}
                    title="Undo last change"
                    aria-label="Undo last change"
                  >
                    &#8630;
                  </button>
                  <button
                    className="btn btn-outline-secondary"
                    onClick={this.redo}
                    disabled={this.state.future.length === 0}
                    title="Redo last change"
                    aria-label="Redo last change"
                  >
                    &#8631;
                  </button>
                </div>
              </div>
              {this.renderTabList()}
              <ul className="list-group list-group-flush border-top-0">
                {this.renderItems()}
              </ul>
            </div>
          </div>
        </div>
        {this.state.modal ? (
          <CustomModal
            activeItem={this.state.activeItem}
            toggle={this.toggle}
            onSave={this.handleSubmit}
          />
        ) : null}
      </main>
    );
  }
}

export default App;
