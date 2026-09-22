import React, { useState } from 'react';
import { Button, Input, FormGroup, Label } from 'reactstrap';

const AITaskInput = ({ onTaskCreate }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);

  const analyzeWithAI = async () => {
    setIsAnalyzing(true);
    try {
      const response = await axios.post('/api/todos/analyze/', {
        title,
        description
      });
      setAiSuggestions(response.data);
    } catch (error) {
      console.error('AI analysis failed:', error);
    }
    setIsAnalyzing(false);
  };

  const handleSubmit = () => {
    const task = {
      title,
      description,
      ...(aiSuggestions && {
        ai_category: aiSuggestions.category,
        ai_priority: aiSuggestions.priority
      })
    };
    onTaskCreate(task);
    setTitle('');
    setDescription('');
    setAiSuggestions(null);
  };

  return (
    <div className="ai-task-input">
      <FormGroup>
        <Label>Task Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter task title"
        />
      </FormGroup>
      
      <FormGroup>
        <Label>Description</Label>
        <Input
          type="textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter task description"
        />
      </FormGroup>
      
      <Button 
        color="info" 
        onClick={analyzeWithAI}
        disabled={isAnalyzing || !title.trim()}
      >
        {isAnalyzing ? 'Analyzing...' : '🤖 Analyze with AI'}
      </Button>
      
      {aiSuggestions && (
        <div className="ai-suggestions mt-3">
          <h6>AI Suggestions:</h6>
          <p><strong>Category:</strong> {aiSuggestions.category}</p>
          <p><strong>Priority:</strong> {aiSuggestions.priority}</p>
        </div>
      )}
      
      <Button color="primary" onClick={handleSubmit} className="mt-2">
        Create Task
      </Button>
    </div>
  );
};

export default AITaskInput;