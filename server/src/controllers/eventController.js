const eventService = require('../services/eventService');
const {
  createEventSchema,
  updateEventSchema,
  registerAttendeeSchema,
  eventQuerySchema
} = require('../validations/eventValidation');

const createEvent = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const validatedData = createEventSchema.parse(req.body);
    const event = await eventService.createEvent(validatedData, ngoId, req.user);
    res.status(201).json({
      success: true,
      message: 'Event created successfully.',
      data: { event }
    });
  } catch (err) {
    next(err);
  }
};

const getEvents = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const validatedQuery = eventQuerySchema.parse(req.query);
    const result = await eventService.getEvents(validatedQuery, ngoId);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const getEventById = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const result = await eventService.getEventById(req.params.id, ngoId);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const updateEvent = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const validatedData = updateEventSchema.parse(req.body);
    const event = await eventService.updateEvent(req.params.id, validatedData, ngoId, req.user);
    res.status(200).json({
      success: true,
      message: 'Event updated successfully.',
      data: { event }
    });
  } catch (err) {
    next(err);
  }
};

const registerAttendee = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const validatedData = registerAttendeeSchema.parse(req.body);
    const attendee = await eventService.registerAttendee(req.params.id, validatedData, ngoId, req.user);
    res.status(201).json({
      success: true,
      message: 'Attendee registered successfully.',
      data: { attendee }
    });
  } catch (err) {
    next(err);
  }
};

const checkInAttendee = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const attendee = await eventService.checkInAttendee(
      req.params.id,
      req.params.attendeeId,
      ngoId,
      req.user
    );
    res.status(200).json({
      success: true,
      message: 'Attendee checked in successfully.',
      data: { attendee }
    });
  } catch (err) {
    next(err);
  }
};

const getEventSummary = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const summary = await eventService.getEventSummary(ngoId);
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (err) {
    next(err);
  }
};

const deleteEvent = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const result = await eventService.deleteEvent(req.params.id, ngoId, req.user);
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (err) {
    next(err);
  }
};

const exportEvents = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const validatedQuery = eventQuerySchema.parse(req.query);
    const csvContent = await eventService.exportEventsCsv(validatedQuery, ngoId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="events_export_${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  registerAttendee,
  checkInAttendee,
  getEventSummary,
  deleteEvent,
  exportEvents
};
