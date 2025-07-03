/**
 * Department Classifier Utility
 * Determines department flags based on name and type patterns
 */

/**
 * Classify department and determine special flags
 * @param {string} departmentName - The department name
 * @param {string} departmentType - The department type
 * @returns {Object} Classification with boolean flags
 */
function classifyDepartment(departmentName, departmentType) {
  const name = (departmentName || '').toLowerCase().trim();
  const type = (departmentType || '').toLowerCase().trim();
  
  // Initialize flags
  let isCarWash = false;
  let isFuel = false;
  let isLottery = false;
  
  // Car Wash Detection
  const carWashKeywords = [
    'car wash', 'carwash', 'wash', 'vehicle wash', 'auto wash'
  ];
  isCarWash = carWashKeywords.some(keyword => name.includes(keyword));
  
  // Fuel Department Detection
  const fuelKeywords = [
    'fuel', 'gas', 'gasoline', 'diesel', 'petroleum', 'pump', 'dispenser',
    'unleaded', 'premium', 'regular', 'e85', 'ethanol'
  ];
  const fuelTypes = ['fuel', 'gasoline', 'petroleum'];
  
  isFuel = fuelKeywords.some(keyword => name.includes(keyword)) ||
           fuelTypes.some(fuelType => type.includes(fuelType));
  
  // Lottery Department Detection
  const lotteryKeywords = [
    'lottery', 'lotto', 'instant', 'scratch', 'powerball', 'mega millions',
    'pick 3', 'pick 4', 'keno', 'scratch off', 'instant win'
  ];
  const lotteryTypes = ['lottery', 'gaming'];
  
  isLottery = lotteryKeywords.some(keyword => name.includes(keyword)) ||
              lotteryTypes.some(lotteryType => type.includes(lotteryType)) ||
              (name.includes('instant') && name.includes('lotto'));
  
  return {
    is_car_wash_department: isCarWash,
    is_fuel_department: isFuel,
    is_lottery_department: isLottery,
    classification_reason: {
      car_wash: isCarWash ? 'Name contains car wash keywords' : null,
      fuel: isFuel ? 'Name/type contains fuel keywords' : null,
      lottery: isLottery ? 'Name/type contains lottery keywords' : null
    }
  };
}

/**
 * Update department with classification flags
 * @param {Object} department - Sequelize department instance
 * @returns {Object} Updated department with flags
 */
async function updateDepartmentClassification(department) {
  const classification = classifyDepartment(department.department_name, department.department_type);
  
  // Update the department with new flags
  await department.update({
    is_car_wash_department: classification.is_car_wash_department,
    is_fuel_department: classification.is_fuel_department,
    is_lottery_department: classification.is_lottery_department
  });
  
  return {
    ...department.toJSON(),
    classification_reason: classification.classification_reason
  };
}

/**
 * Batch update all departments with classification
 * @param {Object} models - Sequelize models
 * @returns {Array} Results of classification updates
 */
async function classifyAllDepartments(models) {
  const departments = await models.Departments.findAll();
  const results = [];
  
  for (const department of departments) {
    try {
      const result = await updateDepartmentClassification(department);
      results.push({
        success: true,
        department_id: department.department_id,
        department_name: department.department_name,
        flags: {
          is_car_wash_department: result.is_car_wash_department,
          is_fuel_department: result.is_fuel_department,
          is_lottery_department: result.is_lottery_department
        },
        classification_reason: result.classification_reason
      });
    } catch (error) {
      results.push({
        success: false,
        department_id: department.department_id,
        department_name: department.department_name,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Get department statistics after classification
 * @param {Object} models - Sequelize models
 * @returns {Object} Statistics about classified departments
 */
async function getDepartmentStatistics(models) {
  const stats = await models.Departments.findAll({
    attributes: [
      [models.sequelize.fn('COUNT', models.sequelize.col('department_id')), 'total_departments'],
      [models.sequelize.fn('SUM', models.sequelize.literal('CASE WHEN is_car_wash_department THEN 1 ELSE 0 END')), 'car_wash_count'],
      [models.sequelize.fn('SUM', models.sequelize.literal('CASE WHEN is_fuel_department THEN 1 ELSE 0 END')), 'fuel_count'],
      [models.sequelize.fn('SUM', models.sequelize.literal('CASE WHEN is_lottery_department THEN 1 ELSE 0 END')), 'lottery_count']
    ],
    raw: true
  });
  
  return stats[0];
}

module.exports = {
  classifyDepartment,
  updateDepartmentClassification,
  classifyAllDepartments,
  getDepartmentStatistics
}; 