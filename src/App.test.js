import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Mock axios
jest.mock('axios');
import axios from 'axios';

describe('Todo App', () => {
  beforeEach(() => {
    axios.get.mockResolvedValue({ data: [] });
  });

  test('renders todo app title', () => {
    render(<App />);
    const titleElement = screen.getByText(/todo app/i);
    expect(titleElement).toBeInTheDocument();
  });

  test('shows add task button', () => {
    render(<App />);
    const addButton = screen.getByText(/add task/i);
    expect(addButton).toBeInTheDocument();
  });
 });