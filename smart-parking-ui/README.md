# Smart Parking UI

A modern React application for Smart Parking System management with Tailwind CSS.

## 🚀 Features

- **Modern UI**: Built with React 18 and TypeScript
- **Styling**: Tailwind CSS for beautiful, responsive design
- **Icons**: Lucide React for consistent iconography
- **Routing**: React Router for navigation
- **HTTP Client**: Axios for API calls

## 📦 Installation

```bash
cd smart-parking-ui
npm install
```

## 🏃‍♂️ Running the Application

```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

## 🛠️ Tech Stack

- **React 18** - UI Library
- **TypeScript** - Type Safety
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **React Router** - Navigation
- **Axios** - HTTP Client

## 📁 Project Structure

```
src/
├── components/     # Reusable components
├── pages/         # Page components
├── hooks/         # Custom React hooks
├── services/      # API services
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
└── assets/        # Static assets
```

## 🎨 Design System

### Colors
- **Primary**: Blue (#3b82f6)
- **Secondary**: Gray (#64748b)
- **Success**: Green (#10b981)
- **Warning**: Yellow (#f59e0b)
- **Error**: Red (#ef4444)

### Components
- Cards with shadow and rounded corners
- Responsive grid layouts
- Hover effects and transitions
- Consistent spacing and typography

## 🔧 Development

### Adding New Components
1. Create component in `src/components/`
2. Use TypeScript interfaces for props
3. Style with Tailwind CSS classes
4. Add to storybook if needed

### API Integration
1. Create service in `src/services/`
2. Use Axios for HTTP requests
3. Handle loading and error states
4. Type API responses

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

## 🚀 Deployment

```bash
npm run build
```

The build output will be in the `build/` directory, ready for deployment.

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

MIT License
