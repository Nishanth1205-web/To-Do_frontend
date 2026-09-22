import React, { Component } from "react";
import Modal from "./components/Modal";
import axios from "axios";

// Configure axios to use the API URL from the environment variable
// Use the backend URL for API calls
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"; 
axios.defaults.baseURL = API_URL;

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
      undoStack: [],
      redoStack: [],
      statusMessage: "",
      isPerformingHistoryAction: false,
    };
    this.statusTimer = null;
  }

  componentDidMount() {
    this.refreshList();
    document.addEventListener("keydown", this.handleKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this.handleKeyDown);
    if (this.statusTimer) {
      clearTimeout(this.statusTimer);
    }
  }

  handleKeyDown = (e) => {
    // Ignore keyboard shortcuts when typing in inputs/textareas or when modal is open
    if (this.state.modal || ["INPUT", "TEXTAREA"].includes(e.target.tagName)) {
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      if (e.shiftKey) {
        e.preventDefault();
        this.handleRedo();
      } else {
        e.preventDefault();
        this.handleUndo();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
      e.preventDefault();
      this.handleRedo();
    }
  };

  showStatus = (message) => {
    if (this.statusTimer) {
      clearTimeout(this.statusTimer);
    }
    this.setState({ statusMessage: message });
    this.statusTimer = setTimeout(() => {
      this.setState({ statusMessage: "" });
    }, 3500);
  };

  refreshList = () => {
    return axios
      .get("/api/todos/")
      .then((res) => {
        this.setState({ todoList: res.data });
        return res.data;
      })
      .catch((err) => {
        console.error("Error fetching todos:", err);
      });
  };

  toggle = () => {
    this.setState({ modal: !this.state.modal });
  };

  handleSubmit = (item) => {
    this.toggle();

    if (item.id) {
      const previousItem = this.state.todoList.find((t) => t.id === item.id);
      axios
        .put(`/api/todos/${item.id}/`, item)
        .then((res) => {
          this.setState({
            undoStack: [
              ...this.state.undoStack,
              {
                type: "UPDATE",
                previousItem: previousItem || item,
                updatedItem: res.data,
                description: `Edit "${item.title}"`,
              },
            ],
            redoStack: [],
          });
          this.refreshList();
        })
        .catch((err) => console.error("Error updating todo:", err));
      return;
    }

    axios
      .post("/api/todos/", item)
      .then((res) => {
        this.setState({
          undoStack: [
            ...this.state.undoStack,
            {
              type: "CREATE",
              item: res.data,
              description: `Create "${res.data.title}"`,
            },
          ],
          redoStack: [],
        });
        this.refreshList();
      })
      .catch((err) => console.error("Error creating todo:", err));
  };

  handleDelete = (item) => {
    axios
      .delete(`/api/todos/${item.id}/`)
      .then(() => {
        this.setState({
          undoStack: [
            ...this.state.undoStack,
            {
              type: "DELETE",
              item: item,
              description: `Delete "${item.title}"`,
            },
          ],
          redoStack: [],
        });
        this.refreshList();
      })
      .catch((err) => console.error("Error deleting todo:", err));
  };

  handleToggleComplete = (item) => {
    const updated = { ...item, completed: !item.completed };
    axios
      .put(`/api/todos/${item.id}/`, updated)
      .then((res) => {
        this.setState({
          undoStack: [
            ...this.state.undoStack,
            {
              type: "UPDATE",
              previousItem: item,
              updatedItem: res.data,
              description: `Mark "${item.title}" as ${updated.completed ? "completed" : "incomplete"
                }`,
            },
          ],
          redoStack: [],
        });
        this.refreshList();
      })
      .catch((err) => console.error("Error toggling todo status:", err));
  };

  handleUndo = async () => {
    const { undoStack, isPerformingHistoryAction } = this.state;
    if (undoStack.length === 0 || isPerformingHistoryAction) return;

    const action = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);
    this.setState({ isPerformingHistoryAction: true });

    try {
      if (action.type === "CREATE") {
        // Undo create -> delete the created item
        await axios.delete(`/api/todos/${action.item.id}/`);
        const redoAction = {
          type: "CREATE",
          item: action.item,
          description: action.description,
        };
        this.setState({
          undoStack: newUndoStack,
          redoStack: [...this.state.redoStack, redoAction],
        });
      } else if (action.type === "UPDATE") {
        // Undo update -> revert back to previousItem
        const res = await axios.put(
          `/api/todos/${action.previousItem.id}/`,
          action.previousItem
        );
        const redoAction = {
          type: "UPDATE",
          previousItem: action.previousItem,
          updatedItem: res.data,
          description: action.description,
        };
        this.setState({
          undoStack: newUndoStack,
          redoStack: [...this.state.redoStack, redoAction],
        });
      } else if (action.type === "DELETE") {
        // Undo delete -> re-create the deleted item
        const { id, ...itemData } = action.item;
        const res = await axios.post("/api/todos/", itemData);
        const redoAction = {
          type: "DELETE",
          item: res.data, // save newly assigned id for redo delete
          description: action.description,
        };
        this.setState({
          undoStack: newUndoStack,
          redoStack: [...this.state.redoStack, redoAction],
        });
      }

      this.showStatus(`Undid: ${action.description}`);
      await this.refreshList();
    } catch (err) {
      console.error("Undo error:", err);
      this.showStatus("Failed to undo action.");
    } finally {
      this.setState({ isPerformingHistoryAction: false });
    }
  };

  handleRedo = async () => {
    const { redoStack, isPerformingHistoryAction } = this.state;
    if (redoStack.length === 0 || isPerformingHistoryAction) return;

    const action = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);
    this.setState({ isPerformingHistoryAction: true });

    try {
      if (action.type === "CREATE") {
        // Redo create -> re-create the item
        const { id, ...itemData } = action.item;
        const res = await axios.post("/api/todos/", itemData);
        const undoAction = {
          type: "CREATE",
          item: res.data,
          description: action.description,
        };
        this.setState({
          redoStack: newRedoStack,
          undoStack: [...this.state.undoStack, undoAction],
        });
      } else if (action.type === "UPDATE") {
        // Redo update -> re-apply updatedItem
        const res = await axios.put(
          `/api/todos/${action.updatedItem.id}/`,
          action.updatedItem
        );
        const undoAction = {
          type: "UPDATE",
          previousItem: action.previousItem,
          updatedItem: res.data,
          description: action.description,
        };
        this.setState({
          redoStack: newRedoStack,
          undoStack: [...this.state.undoStack, undoAction],
        });
      } else if (action.type === "DELETE") {
        // Redo delete -> delete the item
        await axios.delete(`/api/todos/${action.item.id}/`);
        const undoAction = {
          type: "DELETE",
          item: action.item,
          description: action.description,
        };
        this.setState({
          redoStack: newRedoStack,
          undoStack: [...this.state.undoStack, undoAction],
        });
      }

      this.showStatus(`Redid: ${action.description}`);
      await this.refreshList();
    } catch (err) {
      console.error("Redo error:", err);
      this.showStatus("Failed to redo action.");
    } finally {
      this.setState({ isPerformingHistoryAction: false });
    }
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
          onClick={() => this.displayCompleted(true)}
          className={this.state.viewCompleted ? "nav-link active" : "nav-link"}
        >
          Complete
        </span>
        <span
          onClick={() => this.displayCompleted(false)}
          className={this.state.viewCompleted ? "nav-link" : "nav-link active"}
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

    if (newItems.length === 0) {
      return (
        <li className="list-group-item text-center text-muted py-4">
          No {viewCompleted ? "completed" : "incomplete"} tasks found
        </li>
      );
    }

    return newItems.map((item) => (
      <li
        key={item.id}
        className="list-group-item d-flex justify-content-between align-items-center"
      >
        <div className="d-flex align-items-center">
          <input
            type="checkbox"
            className="mr-3"
            checked={item.completed}
            onChange={() => this.handleToggleComplete(item)}
            title={item.completed ? "Mark incomplete" : "Mark completed"}
            style={{ cursor: "pointer", width: "18px", height: "18px" }}
          />
          <span
            className={`todo-title ${item.completed ? "completed-todo text-muted" : ""
              }`}
            title={item.description}
            onClick={() => this.handleToggleComplete(item)}
          >
            {item.title}
          </span>
        </div>
        <span>
          <button
            className="btn btn-outline-secondary btn-sm mr-2"
            onClick={() => this.editItem(item)}
          >
            Edit
          </button>
          <button
            className="btn btn-outline-danger btn-sm"
            onClick={() => this.handleDelete(item)}
          >
            Delete
          </button>
        </span>
      </li>
    ));
  };

  render() {
    const { undoStack, redoStack, statusMessage, isPerformingHistoryAction } =
      this.state;
    const canUndo = undoStack.length > 0 && !isPerformingHistoryAction;
    const canRedo = redoStack.length > 0 && !isPerformingHistoryAction;
    const lastUndo = undoStack[undoStack.length - 1];
    const lastRedo = redoStack[redoStack.length - 1];

    return (
      <main className="container py-4">
        <h1 className="text-white text-uppercase text-center my-4 font-weight-bold">
          Todo App
        </h1>
        <div className="row">
          <div className="col-md-7 col-sm-10 mx-auto p-0">
            <div className="card p-3 shadow-lg border-0">
              {/* Header toolbar with Add Task, Undo, and Redo */}
              <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
                <button
                  className="btn btn-primary font-weight-bold px-3 shadow-sm"
                  onClick={this.createItem}
                >
                  + Add task
                </button>

                <div className="d-flex align-items-center mt-2 mt-sm-0">
                  <button
                    className="btn btn-outline-secondary mr-2 shadow-sm undo-redo-btn"
                    onClick={this.handleUndo}
                    disabled={!canUndo}
                    title={
                      lastUndo
                        ? `Undo: ${lastUndo.description} (Ctrl+Z)`
                        : "Nothing to undo (Ctrl+Z)"
                    }
                  >
                    <span className="mr-1 font-weight-bold">&#x21A9;</span> Undo
                    {undoStack.length > 0 && (
                      <span className="badge badge-secondary ml-1">
                        {undoStack.length}
                      </span>
                    )}
                  </button>

                  <button
                    className="btn btn-outline-secondary shadow-sm undo-redo-btn"
                    onClick={this.handleRedo}
                    disabled={!canRedo}
                    title={
                      lastRedo
                        ? `Redo: ${lastRedo.description} (Ctrl+Y)`
                        : "Nothing to redo (Ctrl+Y)"
                    }
                  >
                    <span className="mr-1 font-weight-bold">&#x21AA;</span> Redo
                    {redoStack.length > 0 && (
                      <span className="badge badge-secondary ml-1">
                        {redoStack.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Status Toast Banner */}
              {statusMessage && (
                <div className="alert alert-info py-2 px-3 mb-3 d-flex justify-content-between align-items-center shadow-sm">
                  <span>
                    <strong className="mr-1">&#x2139;</strong> {statusMessage}
                  </span>
                  <small className="text-muted">Ctrl+Z / Ctrl+Y</small>
                </div>
              )}

              {this.renderTabList()}
              <ul className="list-group list-group-flush border-top-0 mt-2">
                {this.renderItems()}
              </ul>
            </div>
          </div>
        </div>
        {this.state.modal ? (
          <Modal
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