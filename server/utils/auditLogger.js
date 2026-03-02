/**
 * Audit logging utility for tracking important actions
 */

export const logPasswordChange = async (client, adminId, employeeId, employeeName, ipAddress = null, userAgent = null) => {
  try {
    const logQuery = `
      INSERT INTO audit_log (
        action_type, 
        admin_id, 
        target_employee_id, 
        target_employee_name, 
        timestamp, 
        details,
        ip_address,
        user_agent
      ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7)
    `;
    
    const logValues = [
      'PASSWORD_CHANGE',
      adminId,
      employeeId,
      employeeName,
      `Admin ${adminId} changed password for employee ${employeeName} (ID: ${employeeId})`,
      ipAddress,
      userAgent
    ];
    
    await client.query(logQuery, logValues);
    console.log(`Audit log: Password change recorded for employee ${employeeId} by admin ${adminId}`);
  } catch (error) {
    console.error('Failed to log password change audit:', error);
    // Don't throw error - audit logging failure shouldn't break the main operation
  }
};

export const logEmployeeCreation = async (client, adminId, employeeId, employeeName, ipAddress = null, userAgent = null) => {
  try {
    const logQuery = `
      INSERT INTO audit_log (
        action_type, 
        admin_id, 
        target_employee_id, 
        target_employee_name, 
        timestamp, 
        details,
        ip_address,
        user_agent
      ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7)
    `;
    
    const logValues = [
      'EMPLOYEE_CREATION',
      adminId,
      employeeId,
      employeeName,
      `Admin ${adminId} created new employee ${employeeName} (ID: ${employeeId})`,
      ipAddress,
      userAgent
    ];
    
    await client.query(logQuery, logValues);
    console.log(`Audit log: Employee creation recorded for employee ${employeeId} by admin ${adminId}`);
  } catch (error) {
    console.error('Failed to log employee creation audit:', error);
  }
};
