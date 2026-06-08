import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import { Appointment } from "../models/appointmentSchema.js";
import { User } from "../models/userSchema.js";

export const postAppointment = catchAsyncErrors(async(req, res, next)=>{
    const {
        firstName,
        lastName,
        email,
        phone,
        nic,
        dob,
        gender,
        appointment_date,
        department,
        doctor_firstName,
        doctor_lastName,
        hasVisited,
        address,
    } = req.body;

    const selectedDate = new Date(appointment_date);
const today = new Date();

today.setHours(0, 0, 0, 0);

if (selectedDate < today) {
  return next(
    new ErrorHandler(
      "Past date appointment is not allowed",
      400
    )
  );
}

    if(
        !firstName ||
        !lastName ||
        !email ||
        !phone ||
        !nic ||
        !dob ||
        !gender ||
        !appointment_date ||
        !department ||
        !doctor_firstName ||
        !doctor_lastName ||
        !address
    ){
        return next(new ErrorHandler("Please Fill Full Form!", 400));
    }
    const isConflict = await User.find({
        firstName: doctor_firstName,
        lastName: doctor_lastName,
        role: "Doctor",
        doctorDepartment: department
    })

    if(isConflict.length === 0){
        return next(new ErrorHandler("Doctor Not Found!", 400));
    }
    if(isConflict.length>1){
        return next(new ErrorHandler("Doctors Conflict Please Contact Through Email or Phone!", 400));
    }

    const doctorId = isConflict[0]._id;
    const patientId = req.user._id;
    const appointment = await Appointment.create({
        firstName,
        lastName,
        email,
        phone,
        nic,
        dob,
        gender,
        appointment_date,
        department,
        doctor: {
            firstName: doctor_firstName,
            lastName: doctor_lastName
        },
        hasVisited,
        address,
        doctorId,
        patientId
    });
    res.status(200).json({
        success: true,
        message: "Appointment Sent Successfully!",
        appointment,
    });
});

export const getAllAppointments = catchAsyncErrors(async(req, res, next)=>{
    const appointments = await Appointment.find();
    res.status(200).json({
        success: true,
        appointments,
    });
});

export const getMyAppointments = catchAsyncErrors(
  async (req, res, next) => {

    const appointments = await Appointment.find({
       patientId:req.user._id
       }).sort({ _id: -1 });

    res.status(200).json({
      success: true,
      appointments,
    });
});

export const updateAppointmentStatus = catchAsyncErrors(
  async (req, res, next) => {

    const { id } = req.params;

    let appointment = await Appointment.findById(id);

    if (!appointment) {
      return next(
        new ErrorHandler(
          "Appointment Not Found!",
          404
        )
      );
    }

    
    if (appointment.status === "Cancelled") {
      return next(
        new ErrorHandler(
          "Cancelled Appointment Cannot Be Updated!",
          400
        )
      );
    }

    appointment.status = req.body.status;

    await appointment.save();

    res.status(200).json({
      success: true,
      message: "Appointment Status Updated!",
      appointment,
    });
});

export const deleteAppointment = catchAsyncErrors(
    async(req, res, next) =>{
        const {id} = req.params;
        let appointment = await Appointment.findById(id);
        if(!appointment){
            return next(new ErrorHandler("Appointment Not Found", 404));
        }
        await appointment.deleteOne();
        res.status(200).json({
            success: true,
            message: "Appointment Deleted!",
        });
});

export const cancelAppointment = catchAsyncErrors(
  async (req, res, next) => {

    const { id } = req.params;

    const appointment = await Appointment.findOne({
      _id: id,
      patientId: req.user._id,
    });

    if (!appointment) {
      return next(
        new ErrorHandler(
          "Appointment Not Found",
          404
        )
      );
    }
     appointment.status = "Cancelled";

    await appointment.save();

    res.status(200).json({
      success: true,
      message:
        "Appointment Cancelled Successfully",
    });
  }
);

export const rescheduleAppointment = catchAsyncErrors(
  async (req, res, next) => {

    const { appointment_date } = req.body;

    const appointment = await Appointment.findOne({
      _id: req.params.id,
       patientId: req.user._id,
  });

    if (!appointment) {
      return next(
        new ErrorHandler(
          "Appointment Not Found!",
          404
        )
      );
    }

    const today = new Date();
today.setHours(0, 0, 0, 0);

const selectedDate = new Date(appointment_date);

if (selectedDate < today) {
  return next(
    new ErrorHandler(
      "Past date is not allowed!",
      400
    )
  );
}

    appointment.appointment_date =
      appointment_date;

    appointment.rescheduled = true;

    appointment.status = "Pending";

    await appointment.save();

    res.status(200).json({
      success: true,
      message:
        "Appointment Rescheduled Successfully",
      appointment,
    });
  }
);