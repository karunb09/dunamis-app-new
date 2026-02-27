const express = require('express');
const router = express.Router();
const teacherApplicationController = require('../controller/teacherApplication.controller');
const TeacherApplication = require("../model/teacherApplication.model")


const auth = require('../middleware/auth'); // For authentication

// ===== PUBLIC ROUTES =====

/**
 * @route   POST /api/teacher-applications/apply
 * @desc    Submit a new teacher application
 * @access  Public
 * @body    Form data with files (cv, profileVideo, relevantCertificate)
 */
router.post('/apply', 
    teacherApplicationController.createTeacherApplication
);

/**
 * @route   GET /api/teacher-applications/status/:id
 * @desc    Get application status by ID (for applicants to check their status)
 * @access  Public
 */
router.get('/status/:id', teacherApplicationController.getTeacherApplicationById);

// ===== PROTECTED/ADMIN ROUTES =====

/**
 * @route   GET /api/teacher-applications
 * @desc    Get all teacher applications with filtering and pagination
 * @access  Admin only
 * @query   ?status=new&page=1&limit=10&sortBy=createdAt&sortOrder=desc
 */
router.get('/get-all', 
    // auth, // Uncomment if using authentication
    // adminAuth, // Uncomment if using admin authorization
    teacherApplicationController.getAllTeacherApplications
);

/**
 * @route   GET /api/teacher-applications/:id
 * @desc    Get a specific teacher application by ID (detailed view)
 * @access  Admin only
 */
router.get('/getApplicationById/:id', 
    // auth, // Uncomment if using authentication
    // adminAuth, // Uncomment if using admin authorization
    teacherApplicationController.getTeacherApplicationById
);

/**
 * @route   PUT /api/teacher-applications/:id/status
 * @desc    Update application status (shortlist, reject, interview, select)
 * @access  Admin only
 * @body    { status: "shortlisted" }
 */
router.put('/updateStatus/:id/status', 
    // auth, // Uncomment if using authentication
    // adminAuth, // Uncomment if using admin authorization
    teacherApplicationController.updateApplicationStatus
);

/**
 * @route   DELETE /api/teacher-applications/:id
 * @desc    Delete a teacher application
 * @access  Admin only
 */
router.delete('/delete/:id', 
    // auth, // Uncomment if using authentication
    // adminAuth, // Uncomment if using admin authorization
    teacherApplicationController.deleteTeacherApplication
);

// ===== ADDITIONAL UTILITY ROUTES =====

/**
 * @route   GET /api/teacher-applications/stats/overview
 * @desc    Get application statistics (total, by status, etc.)
 * @access  Admin only
 */
router.get('/stats/overview', 
    // auth, // Uncomment if using authentication
    // adminAuth, // Uncomment if using admin authorization
    async (req, res) => {
        try {
            const TeacherApplication = require('../model/teacherApplication.model');
            
            const stats = await TeacherApplication.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const totalApplications = await TeacherApplication.countDocuments();
            
            const recentApplications = await TeacherApplication.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .select('name email status createdAt');

            res.status(200).json({
                success: true,
                data: {
                    totalApplications,
                    statusBreakdown: stats,
                    recentApplications
                }
            });
        } catch (error) {
            console.error('Error fetching application stats:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
);

/**
 * @route   GET /api/teacher-applications/export/csv
 * @desc    Export applications to CSV
 * @access  Admin only
 */
router.get('/export/csv', 
    // auth, // Uncomment if using authentication
    // adminAuth, // Uncomment if using admin authorization
    async (req, res) => {
        try {
            const { status } = req.query;
            const filter = status ? { status } : {};
            
            const applications = await TeacherApplication.find(filter)
                .select('-cv -profileVideo -relevantCertificate -__v')
                .lean();

            // Convert to CSV format (basic implementation)
            if (applications.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No applications found'
                });
            }

            // Flatten nested objects for CSV
            const flattenedData = applications.map(app => ({
                id: app._id,
                firstName: app.name.firstName,
                lastName: app.name.lastName,
                email: app.email,
                mobileNo: app.mobileNo,
                gender: app.gender,
                readLanguage: app.language.read,
                speakLanguage: app.language.speak,
                currentState: app.currentState,
                currentCity: app.currentCity,
                areaOfExpertise: app.areaOfExpertise,
                yearOfExperience: app.yearOfExperience,
                highestQualification: app.highestQualification,
                currentCTC: app.currentCTC,
                expectedCTC: app.expectedCTC,
                noticePeriod: app.noticePeriod,
                mode: app.mode,
                status: app.status,
                createdAt: app.createdAt,
                updatedAt: app.updatedAt
            }));

            res.status(200).json({
                success: true,
                data: flattenedData,
                message: 'Use this data with a CSV library on the frontend'
            });
        } catch (error) {
            console.error('Error exporting applications:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
);

/**
 * @route   POST /api/teacher-applications/:id/notes
 * @desc    Add notes to an application (for internal tracking)
 * @access  Admin only
 * @body    { note: "Candidate looks promising" }
 */
router.post('/:id/notes', 
    // auth, // Uncomment if using authentication
    // adminAuth, // Uncomment if using admin authorization
    async (req, res) => {
        try {
            const { id } = req.params;
            const { note } = req.body;

            if (!note || note.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Note content is required'
                });
            }

            const TeacherApplication = require('../model/teacherApplication.model');
            
            // Note: You might want to add a notes field to your schema for this to work
            const application = await TeacherApplication.findByIdAndUpdate(
                id,
                { 
                    $push: { 
                        notes: {
                            content: note.trim(),
                            addedAt: new Date(),
                            // addedBy: req.user.id // If you have user info in middleware
                        }
                    }
                },
                { new: true }
            );

            if (!application) {
                return res.status(404).json({
                    success: false,
                    message: 'Teacher application not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Note added successfully',
                data: application
            });
        } catch (error) {
            console.error('Error adding note:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
);

module.exports = router;

/*


=== EXAMPLE API CALLS ===

// Submit application (FormData)
POST /api/teacher-applications/apply
Content-Type: multipart/form-data
Body: FormData with fields + files

// Get all applications (Admin)
GET /api/teacher-applications?status=new&page=1&limit=10

// Get specific application
GET /api/teacher-applications/673abc123def456789

// Update status (Admin)
PUT /api/teacher-applications/673abc123def456789/status
Body: { "status": "shortlisted" }

// Get stats (Admin)
GET /api/teacher-applications/stats/overview

// Export to CSV (Admin)
GET /api/teacher-applications/export/csv?status=shortlisted

*/