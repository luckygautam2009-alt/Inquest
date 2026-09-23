const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const healthRoutes = require('./routes/health.routes');
const contextRoutes = require('./routes/context.routes');
const complaintRoutes = require('./routes/complaint.routes');

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: '10kb' }));
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use('/api', apiLimiter);

app.use('/api/health', healthRoutes);
app.use('/api/customers', contextRoutes);
app.use('/api/complaints', complaintRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`🚀 INQUEST backend running on port ${config.port} [${config.nodeEnv}]`);
});
